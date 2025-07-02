import express from 'express';
import axios from 'axios';

const router = express.Router();

// Required environment variables:
// TAVUS_API_KEY, TAVUS_PERSONA_ID, TAVUS_REPLICA_ID
const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const TAVUS_PERSONA_ID = process.env.TAVUS_PERSONA_ID;
const TAVUS_REPLICA_ID = process.env.TAVUS_REPLICA_ID;
const TAVUS_API_URL = 'https://tavusapi.com/v2/conversations';

// Store guidedProject steps context per conversationId
const conversationSteps = new Map();

/**
 * @route POST /api/tavus/create-conversation
 * @desc Creates a new Tavus conversational video session with context.
 * @access Public
 */
router.post('/create-conversation', async (req, res) => {
  console.log(`[TAVUS DEBUG] /create-conversation endpoint hit at ${new Date().toISOString()}`);
  try {
    const {
      persona_id,
      conversation_name,
      conversational_context, // <-- context from Gemini/project
      replica_id,
      properties = {}
    } = req.body;

    if (!conversational_context) {
      return res.status(400).json({ error: 'conversational_context is required' });
    }

    // Merge default properties
    const mergedProperties = {
      language: 'multilingual',
      enable_closed_captions: true,
      ...properties
    };

    // Build payload, including replica_id if present
    const payload = {
      ...(persona_id ? { persona_id } : {}),
      ...(replica_id ? { replica_id } : {}),
      ...(conversation_name ? { conversation_name } : {}),
      conversational_context,
      properties: mergedProperties
    };

    // Print the Gemini context (conversational_context) before calling Tavus
    process.stdout.write('[TAVUS] Gemini context (conversational_context): ' + JSON.stringify(conversational_context, null, 2) + '\n');
    // Print the full payload being sent to Tavus
    process.stdout.write('[TAVUS] Creating conversation with payload: ' + JSON.stringify(payload, null, 2) + '\n');

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
    console.log(`[TAVUS] Deleting conversation @ URL: ${tavusUrl}`);
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