// scripts/sync-hod-password.js — run manually whenever you want to change HOD's password
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const HOD_USER_ID = '22eb7178-7dda-478c-913f-943565c24347'; // tumhara HOD UID

async function syncPassword() {
    if (!process.env.HOD_PASSWORD) {
        console.error('Add HOD_PASSWORD=yourpassword to .env.local first.');
        return;
    }
    const { data, error } = await supabase.auth.admin.updateUserById(
        HOD_USER_ID,
        { password: process.env.HOD_PASSWORD }
    );
    if (error) console.error('Error:', error.message);
    else console.log('HOD password synced successfully for:', data.user.email);
}

syncPassword();