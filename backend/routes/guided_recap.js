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

    const prompt = `You are a warm, encouraging coding mentor who loves celebrating student achievements! 🎉

Your student just completed an exciting coding project and you want to highlight their amazing progress in a friendly, encouraging way. Remember to speak directly to them using "you".

IMPORTANT: Generate approximately ${desiredRecapPoints} bullet points, each with just 1 short sentence. Do NOT use emojis, markdown formatting, or bullet point symbols (- or *). Just write clean, simple text.

Project context:
${projectContext}

Guided steps:
${stepsContext}

Chat history:
${chatContext}

IDE capabilities: ${capabilities}

Create approximately ${desiredRecapPoints} friendly, encouraging bullet points that celebrate what you accomplished. Use warm, positive language that makes you feel proud of your progress. Each point should be just one sentence and focus on your growth and achievements.`;

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
