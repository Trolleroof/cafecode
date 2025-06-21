import express from "express";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Store active projects in memory (since we don't need persistence)
const activeProjects = new Map();

// Helper function to robustly extract JSON from Gemini responses
const extractJsonFromResponse = (responseText) => {
  // Try to extract JSON from markdown code blocks first
  const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // Try to extract the first {...} or [...] block
  const curlyMatch = responseText.match(/({[\s\S]*})/);
  if (curlyMatch) {
    return curlyMatch[1].trim();
  }
  const arrayMatch = responseText.match(/(\[[\s\S]*\])/);
  if (arrayMatch) {
    return arrayMatch[1].trim();
  }
  // Fallback: return the response as-is
  return responseText.trim();
};

// Helper function to robustly parse JSON, with repair fallback
function robustJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // Try to trim to last closing brace/bracket
    let lastCurly = jsonString.lastIndexOf('}');
    let lastSquare = jsonString.lastIndexOf(']');
    let last = Math.max(lastCurly, lastSquare);
    if (last !== -1) {
      try {
        return JSON.parse(jsonString.slice(0, last + 1));
      } catch (e2) {
        // fall through
      }
    }
    // If still fails, throw with more context
    throw new Error('Invalid JSON from Gemini. Raw response: ' + jsonString);
  }
}

// Start a new guided project
router.post("/startProject", async (req, res) => {
  try {
    const { projectDescription } = req.body;

    if (!projectDescription) {
      return res.status(400).json({ error: "Project description is required" });
    }

    const projectId = uuidv4();

    // Use Gemini to generate steps
    const prompt = `Create a step-by-step guide for the following project. Format the response as a JSON array of steps, where each step has:
- id: string (step number)
- instruction: string (clear, concise instruction)
- lineRanges: number[] (array of line numbers where code should be written)

Project: ${projectDescription}

DO NOT DO ANY OF THE FOLLOWING OR INCLUDE THE FOLLOWING IN THE STEPS:
- tell the user to create new files, because the current setup doesn't require them to do these files

THINGS TO CONSIDER: 
- break down the steps into the smallest possible, assuming the user is a beginner programmer

Example format:
[
  {
    "id": "1",
    "instruction": "Create a function that adds two numbers",
    "lineRanges": [1, 3]
  }
]`;

    const result = await req.geminiService.model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    let steps;
    try {
      // Extract JSON from response (handles both raw JSON and markdown-wrapped JSON)
      const cleanResponse = extractJsonFromResponse(responseText);
      steps = robustJsonParse(cleanResponse);

      // Validate the steps format
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error("Invalid steps format: not an array or empty array");
      }

      // Validate each step
      steps = steps.map((step, index) => ({
        id: String(index + 1),
        instruction: step.instruction || `Step ${index + 1}`,
        lineRanges: Array.isArray(step.lineRanges) ? step.lineRanges : [1, 3],
      }));
    } catch (parseError) {
      console.error("Error parsing Gemini response for steps:", parseError);
      console.error("Raw Gemini response:", responseText);
      return res
        .status(500)
        .json({ error: "Failed to parse steps from AI response." });
    }

    activeProjects.set(projectId, {
      description: projectDescription,
      steps,
      currentStep: 0,
    });

    // Send initial chat message
    const welcomeMessage = {
      type: "assistant",
      content: `I'll guide you through building: "${projectDescription}"\n\nLet's start with the first step:\n\n${steps[0].instruction}\n\nI'll help you write the code in the specified line ranges. Feel free to ask questions at any time!`,
    };

    res.json({ projectId, steps, welcomeMessage });
  } catch (error) {
    console.error("Error starting project:", error);
    res.status(500).json({ error: "Failed to start project" });
  }
});

// Analyze current step
router.post("/analyzeStep", async (req, res) => {
  try {
    const { projectId, stepId, code, language } = req.body;

    if (!projectId || !stepId || !code || !language) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const project = activeProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const currentStep = project.steps[project.currentStep];

    // Use Gemini to analyze the code
    const prompt = `Analyze the following ${language} code for step ${
      currentStep.id
    } of the project.\n\nStep Instruction: ${
      currentStep.instruction
    }\nLine Ranges: ${currentStep.lineRanges.join(
      "-"
    )}\n\n${language.charAt(0).toUpperCase() + language.slice(1)} Code:\n${code}\n\nProvide feedback as a JSON array of objects, where each object has:\n- line: number (line number being analyzed)\n- correct: boolean (whether the code is correct for this line)\n- suggestion: string (optional suggestion if incorrect)\n\nAnalyze this as ${language} code specifically. DO NOT include any additional text or markdown outside of the JSON array.\n\nFormat the response as a JSON array.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    let feedback;
    try {
      // Extract JSON from response (handles both raw JSON and markdown-wrapped JSON)
      const cleanResponse = extractJsonFromResponse(responseText);
      feedback = robustJsonParse(cleanResponse);
    } catch (parseError) {
      console.error("Error parsing Gemini response for feedback:", parseError);
      console.error("Raw Gemini response:", responseText);
      return res
        .status(500)
        .json({ error: "Failed to parse feedback from AI response." });
    }

    if (!Array.isArray(feedback)) {
      console.error("Gemini returned invalid feedback format:", feedback);
      return res
        .status(500)
        .json({ error: "AI did not return valid feedback." });
    }

    // Generate a chat message based on the feedback
    let feedbackMessage = "";
    const allCorrect = feedback.every((f) => f.correct);

    if (allCorrect) {
      feedbackMessage =
        "Great job! Your code looks correct. You can proceed to the next step.";
    } else {
      feedbackMessage = "Let's review your code:\n\n";
      feedback.forEach((f) => {
        if (!f.correct) {
          feedbackMessage += `• Line ${f.line}: ${f.suggestion}\n`;
        }
      });
      feedbackMessage += "\nMake these adjustments and try again!";
    }

    res.json({
      feedback,
      chatMessage: {
        type: "assistant",
        content: feedbackMessage,
      },
    });
  } catch (error) {
    console.error("Error analyzing step:", error);
    res.status(500).json({ error: "Failed to analyze step" });
  }
});

// Project-specific chat
router.post("/project-chat", async (req, res) => {
  try {
    const { projectId, currentStep, history } = req.body;

    if (!projectId || !history) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const project = activeProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Format chat history for Gemini
    const chatHistory = history
      .map(
        (msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    const prompt = `You are a helpful coding assistant guiding a user through a project.\nCurrent step: ${project.steps[currentStep].instruction}\n\nChat history:\n${chatHistory}\n\nProvide a helpful, encouraging response that:\n1. Addresses the user's question\n2. Provides relevant guidance for the current step\n3. Uses markdown formatting for code blocks and important points\n4. Keeps the response concise and clear\n\nDO NOT include any additional text or markdown outside of the JSON object.\n\nFormat your response as a JSON object with a 'content' field.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    let formattedResponse;
    try {
      // Extract JSON from response (handles both raw JSON and markdown-wrapped JSON)
      const cleanResponse = extractJsonFromResponse(responseText);
      formattedResponse = robustJsonParse(cleanResponse);
    } catch (parseError) {
      console.error("Error parsing Gemini response for chat:", parseError);
      console.error("Raw Gemini response:", responseText);
      return res
        .status(500)
        .json({ error: "Failed to parse chat response from AI." });
    }

    if (typeof formattedResponse.content !== "string") {
      console.error(
        "Gemini returned invalid chat content format:",
        formattedResponse
      );
      return res
        .status(500)
        .json({ error: "AI did not return valid chat content." });
    }

    res.json({
      response: {
        type: "assistant",
        content: formattedResponse.content,
      },
    });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// Simple chat for non-guided users
router.post("/simple-chat", async (req, res) => {
  try {
    const { history } = req.body;
    if (!history) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Format chat history for Gemini
    const chatHistory = history
      .map(
        (msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    const prompt = `
    You are a helpful coding assistant. Keep your responses very short and concise. 
    If the user asks for more help, encourage them to click the 'Start Guided Project' button for a step-by-step experience. 
    Do not provide detailed help unless the guided project is started.\n\nChat history:\n${chatHistory}\n\nRespond as a JSON object with a 'content' field.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    let formattedResponse;
    try {
      // Extract JSON from response (handles both raw JSON and markdown-wrapped JSON)
      const cleanResponse = extractJsonFromResponse(responseText);
      formattedResponse = robustJsonParse(cleanResponse);
    } catch (parseError) {
      console.error(
        "Error parsing Gemini response for simple chat:",
        parseError
      );
      console.error("Raw Gemini response:", responseText);
      return res
        .status(500)
        .json({ error: "Failed to parse chat response from AI." });
    }

    if (typeof formattedResponse.content !== "string") {
      console.error(
        "Gemini returned invalid chat content format:",
        formattedResponse
      );
      return res
        .status(500)
        .json({ error: "AI did not return valid chat content." });
    }

    res.json({
      response: {
        type: "assistant",
        content: formattedResponse.content,
      },
    });
  } catch (error) {
    console.error("Error processing simple chat:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

export default router;
