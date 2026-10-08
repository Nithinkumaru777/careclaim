import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, createUserScopedClient } from '../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
  supabase?: SupabaseClient;
  token?: string;
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
  }

  const token = authHeader.split(' ')[1];

  if (token === 'mock_jwt_token' && process.env.DEMO_MODE === 'true') {
    req.user = { id: 'mock-user-id', email: 'demo@careclaim.ai' };
    req.token = token;
    req.supabase = undefined as any; // will handle in routes
    return next();
  }

  if (token === 'mock_jwt_token' && process.env.DEMO_MODE !== 'true') {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Demo mode is disabled' } });
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }

    req.user = { id: user.id, email: user.email };
    req.token = token;
    req.supabase = createUserScopedClient(token);
    next();
  } catch (error) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Auth failed' } });
  }
};
