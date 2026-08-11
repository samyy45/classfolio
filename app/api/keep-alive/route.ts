import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    
    // Trivial read-only query to ping the database
    const { error } = await supabase
      .from('divisions')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[GET /api/keep-alive]', error.message);
      return Response.json({ error: 'Database ping failed', details: error.message }, { status: 500 });
    }

    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[GET /api/keep-alive]', err);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
