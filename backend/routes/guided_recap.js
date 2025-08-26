import express from 'express';
const router = express.Router();

// Helper function to create project context
function createProjectContext(projectFiles) {
  if (!projectFiles || !Array.isArray(projectFiles)) {
    return 'No project files available';
  }
  
  return projectFiles
    .map(file => `${file.name} (${file.type}): ${file.content ? file.content.substring(0, 200) + '...' : 'Empty file'}`)
    .join('\n');
}

// Recap route: summarize what the user learned as bullet points
router.post("/recap", async (req, res) => {
  try {
    const { projectFiles, chatHistory, guidedProject, ideCapabilities } = req.body;
    const projectContext = createProjectContext(projectFiles);
    const chatContext = Array.isArray(chatHistory)
      ? chatHistory.map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
      : '';
    const stepsContext = guidedProject && guidedProject.steps
      ? guidedProject.steps.map((s, i) => `Step ${i + 1}: ${s.instruction}`).join('\n')
      : '';
    const capabilities = 'The IDE (Cafecode) is web-based. It supports a built-in terminal, code editing, file management, and code execution for supported languages.';

    const numFiles = projectFiles.length;
    const numSteps = guidedProject?.steps?.length || 0;
    
    // Dynamically adjust the number of recap points based on project length
    // Simple heuristic: 3 points for short projects, up to 7 for very long ones.
    let desiredRecapPoints = 3; 
    if (numSteps > 5) desiredRecapPoints++;
    if (numSteps > 10) desiredRecapPoints++;
    if (numFiles > 5) desiredRecapPoints++;
    if (numFiles > 10) desiredRecapPoints++;
    if (numSteps > 15 && numFiles > 15) desiredRecapPoints = 7;

    const prompt = `You are a coding mentor who helps students reflect on what they learned during their project.

Your student just completed a coding project and you want to summarize the specific skills and concepts they learned. Focus ONLY on concrete things they accomplished and learned to do by looking at the Guided steps, which is provided to you as part of the context.

IMPORTANT: Generate approximately ${desiredRecapPoints} bullet points, each with just 1 short sentence. Do NOT use emojis, markdown formatting, or bullet point symbols (- or *). Just write clean, simple text. Focus on what they learned to do, not their future potential or how promising they are.

Project context:
${projectContext}

Guided steps:
${stepsContext}

Chat history:
${chatContext}

IDE capabilities: ${capabilities}

Create approximately ${desiredRecapPoints} bullet points that summarize what you learned to do during this project. Each point should describe a specific skill, concept, or technique you learned. Keep it factual and focused on your learning outcomes.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    // Try to extract just the bullet list from markdown
    const bulletListMatch = responseText.match(/([-*] .+\n?)+/g);
    const recap = bulletListMatch ? bulletListMatch[0].trim() : responseText.trim();
    res.json({ recap });
  } catch (error) {
    console.error("Error generating recap:", error);
    res.status(500).json({ error: "Failed to generate recap" });
  }
});

export default router;
