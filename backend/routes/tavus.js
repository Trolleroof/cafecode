import express from 'express';
import axios from 'axios';

const router = express.Router();

// TODO: Move these to environment variables for better security
const TAVUS_API_KEY = '45308e32fe4648dd891ab3bfc1cca7f7';
const TAVUS_PERSONA_ID = 'p630c84bf73c';
const TAVUS_API_URL = 'https://tavusapi.com/v2/conversations';

// Store guidedProject steps context per conversationId
const conversationSteps = new Map();

/**
 * @route POST /api/tavus/create-conversation
 * @desc Creates a new Tavus conversational video session.
 * @access Public
 */
router.post('/create-conversation', async (req, res) => {
  try {
    const { persona_id } = req.body;
    const payload = {
      persona_id: persona_id || TAVUS_PERSONA_ID
    };
    const response = await axios.post(
      TAVUS_API_URL,
      payload,
      {
        headers: {
          'x-api-key': TAVUS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error creating Tavus conversation:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
        error: 'Failed to create Tavus conversation',
        details: error.response ? error.response.data : error.message
    });
  }
});

/**
 * @route POST /api/tavus/webhook
 * @desc Handles incoming webhooks from Tavus with user's speech.
 * @access 
 */
router.post('/webhook', async (req, res) => {
    const { transcript, conversation_id } = req.body;
    // Look up the latest steps for this conversation
    const steps = conversationSteps.get(conversation_id) || [];
    let goalsContext = '';
    if (steps.length > 0) {
      goalsContext = `\n\nProject Goals/Steps:` + steps.map(s => `\n  ${s}`).join('');
    } else {
      goalsContext = '\n\nProject Goals/Steps: [No guided project steps]';
    }

    try {
        const geminiService = req.geminiService;
        if (!geminiService) {
            return res.status(500).json({ error: 'Gemini service not available' });
        }

        const prompt = `You are a helpful coding assistant designed for voice conversations.\n\nUser said: "${transcript}". 
        Here are the goals of their coding project that you need to understand and guide then with: ${goalsContext}\n
        \nRespond as a JSON object with a 'content' field. Your response should be concise, clear, and suitable for being read aloud. 
        Always use the project goals/steps above to provide the most relevant and context-aware answer.`;

        const result = await geminiService.model.generateContent(prompt);
        const responseText = (await result.response).text();
        let formattedResponse;
        try {
            // Try to parse the response as JSON
            formattedResponse = JSON.parse(responseText);
        } catch (parseError) {
            // Fallback: return raw text
            formattedResponse = { content: responseText };
        }

        res.json({ reply: formattedResponse.content });
    } catch (error) {
        console.error('Error processing Tavus webhook:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

/**
 * @route POST /api/tavus/update-context
 * @desc Overwrites the conversational context for an active Tavus conversation.
 * @access Public
 */
router.post('/update-context', async (req, res) => {
  const { conversationId, guidedProject, currentCode, currentLanguage, output, projectFiles } = req.body;
  // Log the full request body for debugging
  console.log('[TAVUS] /update-context received body:', JSON.stringify(req.body, null, 2));
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  // Store only the steps for this conversation
  let steps = [];
  if (guidedProject && guidedProject.steps && guidedProject.steps.length > 0) {
    steps = guidedProject.steps.map((step, idx) => `Step ${idx + 1}: ${step.instruction}`);
  }
  conversationSteps.set(conversationId, steps);

  // Compose the full context string including all available information
  let contextParts = [];
  
  // Add project goals/steps
  if (steps.length > 0) {
    contextParts.push(`Project Goals/Steps:\n${steps.join('\n')}`);
  } else {
    contextParts.push('Project Goals/Steps: [No guided project steps]');
  }
  
  // Add current code and language
  if (currentCode && currentLanguage) {
    contextParts.push(`Current Code (${currentLanguage}):\n\`\`\`${currentLanguage}\n${currentCode}\n\`\`\``);
  }
  
  // Add output
  if (output && output.length > 0) {
    contextParts.push(`Recent Output:\n${output.join('\n')}`);
  }
  
  // Add project files
  if (projectFiles && projectFiles.length > 0) {
    const filesInfo = projectFiles.map(file => `${file.name} (${file.type})`).join(', ');
    contextParts.push(`Project Files: ${filesInfo}`);
  }
  
  const conversationalContext = contextParts.join('\n\n');

  // Log the context update
  console.log(`[TAVUS] Updating context for conversationId: ${conversationId}`);
  console.log(`[TAVUS] New conversationalContext:\n${conversationalContext}`);

  try {
    // Build the correct Tavus event payload and endpoint (per your provided example)
    const tavusUrl = `https://tavusapi.com/v2/conversations`;
    const eventPayload = {
      message_type: "conversation",
      event_type: "conversation.overwrite_llm_context",
      conversation_id: conversationId,
      properties: {
        context: conversationalContext
      }

      
    };
    console.log(`[TAVUS] Posting context update to URL: ${tavusUrl}`);
    console.log(`[TAVUS] Event payload:`, JSON.stringify(eventPayload, null, 2));
    await axios.post(
      tavusUrl,
      eventPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': TAVUS_API_KEY,
        },
      }
    );
    res.json({ success: true });
  } catch (error) {
    if (error.response) {
      console.error('Error updating Tavus context:');
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    res.status(500).json({ error: 'Failed to update Tavus context' });
  }
});

/**
 * @route DELETE /api/tavus/delete-conversation
 * @desc Deletes a Tavus conversation by ID
 * @access Public
 */
router.delete('/delete-conversation', async (req, res) => {
  const { conversationId } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }
  try {
    const tavusUrl = `https://tavusapi.com/v2/conversations/${conversationId}`;
    console.log(`[TAVUS] Deleting conversation at URL: ${tavusUrl}`);
    await axios.delete(tavusUrl, {
      headers: {
        'x-api-key': TAVUS_API_KEY,
      },
    });
    res.json({ success: true });
  } catch (error) {
    if (error.response) {
      console.error('Error deleting Tavus conversation:');
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Data:', error.response.data);
    } else {
      console.error('Error deleting Tavus conversation:', error.message);
    }
    res.status(500).json({ error: 'Failed to delete Tavus conversation', details: error.message });
  }
});

export default router; 