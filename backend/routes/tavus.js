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
    // In a real application, you might want to configure a callback URL
    // to receive webhooks about the conversation status.
    // const { callback_url } = req.body;

    const response = await axios.post(
      TAVUS_API_URL,
      {
        persona_id: TAVUS_PERSONA_ID,
        // callback_url: callback_url || 'YOUR_BACKEND_URL/api/tavus/webhook'
      },
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
 * @access Public (called by Tavus)
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

        const prompt = `You are a helpful coding assistant designed for voice conversations.\n\nUser said: "${transcript}"${goalsContext}\n\nRespond as a JSON object with a 'content' field. Your response should be concise, clear, and suitable for being read aloud. Always use the project goals/steps above to provide the most relevant and context-aware answer.`;

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
  const { conversationId, guidedProject } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }

  // Store only the steps for this conversation
  let steps = [];
  if (guidedProject && guidedProject.steps && guidedProject.steps.length > 0) {
    steps = guidedProject.steps.map((step, idx) => `Step ${idx + 1}: ${step.instruction}`);
  }
  conversationSteps.set(conversationId, steps);

  // Compose the context string (for Tavus API, but only steps)
  let goalsContext = '';
  if (steps.length > 0) {
    goalsContext = `Project Goals/Steps:\n` + steps.join('\n');
  } else {
    goalsContext = 'Project Goals/Steps: [No guided project steps]';
  }
  const conversationalContext = `${goalsContext}`;

  try {
    // Tavus "Overwrite Conversational Context" event
    await axios.post(
      `https://tavusapi.com/v2/conversations/${conversationId}/events`,
      {
        type: "overwrite_conversational_context",
        conversational_context: conversationalContext
      },
      {
        headers: {
          'x-api-key': TAVUS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating Tavus context:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to update Tavus context', details: error.response ? error.response.data : error.message });
  }
});

export default router; 