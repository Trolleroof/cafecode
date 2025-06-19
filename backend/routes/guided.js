import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Store active projects in memory (since we don't need persistence)
const activeProjects = new Map();

// Start a new guided project
router.post('/startProject', async (req, res) => {
  try {
    const { projectDescription } = req.body;
    
    if (!projectDescription) {
      return res.status(400).json({ error: 'Project description is required' });
    }

    const projectId = uuidv4();
    
    // Use Gemini to generate steps
    const prompt = `Create a step-by-step guide for the following project. Format the response as a JSON array of steps, where each step has:
- id: string (step number)
- instruction: string (clear, concise instruction)
- lineRanges: number[] (array of line numbers where code should be written)

DO NOT include any additional text or markdown outside of the JSON array.

Project: ${projectDescription}

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
      // Try to parse the response as JSON
      steps = JSON.parse(responseText);
      
      // Validate the steps format
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error('Invalid steps format: not an array or empty array');
      }
      
      // Validate each step
      steps = steps.map((step, index) => ({
        id: String(index + 1),
        instruction: step.instruction || `Step ${index + 1}`,
        lineRanges: Array.isArray(step.lineRanges) ? step.lineRanges : [1, 3]
      }));
    } catch (parseError) {
      console.error('Error parsing Gemini response for steps:', parseError);
      console.error('Raw Gemini response:', responseText);
      return res.status(500).json({ error: 'Failed to parse steps from AI response.' });
    }

    activeProjects.set(projectId, {
      description: projectDescription,
      steps,
      currentStep: 0
    });

    // Send initial chat message
    const welcomeMessage = {
      type: 'assistant',
      content: `I'll guide you through building: "${projectDescription}"\n\nLet's start with the first step:\n\n${steps[0].instruction}\n\nI'll help you write the code in the specified line ranges. Feel free to ask questions at any time!`
    };

    res.json({ projectId, steps, welcomeMessage });
  } catch (error) {
    console.error('Error starting project:', error);
    res.status(500).json({ error: 'Failed to start project' });
  }
});

// Analyze current step
router.post('/analyzeStep', async (req, res) => {
  try {
    const { projectId, stepId, code } = req.body;
    
    if (!projectId || !stepId || !code) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const project = activeProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const currentStep = project.steps[project.currentStep];
    
    // Use Gemini to analyze the code
    const prompt = `Analyze the following code for step ${currentStep.id} of the project.\n\nStep Instruction: ${currentStep.instruction}\nLine Ranges: ${currentStep.lineRanges.join('-')}\n\nCode:\n${code}\n\nProvide feedback as a JSON array of objects, where each object has:\n- line: number (line number being analyzed)\n- correct: boolean (whether the code is correct for this line)\n- suggestion: string (optional suggestion if incorrect)\n\nDO NOT include any additional text or markdown outside of the JSON array.\n\nFormat the response as a JSON array.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    let feedback;
    try {
      feedback = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing Gemini response for feedback:', parseError);
      console.error('Raw Gemini response:', responseText);
      return res.status(500).json({ error: 'Failed to parse feedback from AI response.' });
    }

    if (!Array.isArray(feedback)) {
      console.error('Gemini returned invalid feedback format:', feedback);
      return res.status(500).json({ error: 'AI did not return valid feedback.' });
    }

    // Generate a chat message based on the feedback
    let feedbackMessage = '';
    const allCorrect = feedback.every(f => f.correct);
    
    if (allCorrect) {
      feedbackMessage = "Great job! Your code looks correct. You can proceed to the next step.";
    } else {
      feedbackMessage = "Let's review your code:\n\n";
      feedback.forEach(f => {
        if (!f.correct) {
          feedbackMessage += `• Line ${f.line}: ${f.suggestion}\n`;
        }
      });
      feedbackMessage += "\nMake these adjustments and try again!";
    }

    res.json({ 
      feedback,
      chatMessage: {
        type: 'assistant',
        content: feedbackMessage
      }
    });
  } catch (error) {
    console.error('Error analyzing step:', error);
    res.status(500).json({ error: 'Failed to analyze step' });
  }
});

// Project-specific chat
router.post('/chat', async (req, res) => {
  try {
    const { projectId, currentStep, history } = req.body;
    
    if (!projectId || !history) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const project = activeProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Format chat history for Gemini
    const chatHistory = history.map(msg => 
      `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const prompt = `You are a helpful coding assistant guiding a user through a project.\nCurrent step: ${project.steps[currentStep].instruction}\n\nChat history:\n${chatHistory}\n\nProvide a helpful, encouraging response that:\n1. Addresses the user's question\n2. Provides relevant guidance for the current step\n3. Uses markdown formatting for code blocks and important points\n4. Keeps the response concise and clear\n\nDO NOT include any additional text or markdown outside of the JSON object.\n\nFormat your response as a JSON object with a 'content' field.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    let formattedResponse;
    try {
      formattedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing Gemini response for chat:', parseError);
      console.error('Raw Gemini response:', responseText);
      return res.status(500).json({ error: 'Failed to parse chat response from AI.' });
    }

    if (typeof formattedResponse.content !== 'string') {
      console.error('Gemini returned invalid chat content format:', formattedResponse);
      return res.status(500).json({ error: 'AI did not return valid chat content.' });
    }

    res.json({ 
      response: {
        type: 'assistant',
        content: formattedResponse.content
      }
    });
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

export default router; 