import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { parseAndValidateExcel } from '@/lib/excelParser';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const isDryRun = formData.get('dryRun') !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 413 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel'
    ];
    if ((ext !== 'xlsx' && ext !== 'csv') || (file.type && !validTypes.includes(file.type))) {
      return NextResponse.json({ error: 'Invalid file format. Only .xlsx and .csv are allowed.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Fetch active divisions
    const { data: divisions, error: divError } = await supabase
      .from('divisions')
      .select('id, name')
      .eq('is_active', true);

    if (divError) throw divError;

    // Parse and validate
    const { valid, errors, total_rows } = parseAndValidateExcel(buffer, divisions || []);

    const finalValid = [];
    
    // Check uniqueness of PRN and APAAR for valid rows against DB
    if (valid.length > 0) {
      const prns = valid.map(r => r.data.prn_number);
      const apaars = valid.map(r => r.data.apaar_id).filter(a => !!a) as string[];

      const [prnRes, apaarRes] = await Promise.all([
        supabase.from('students').select('prn_number').in('prn_number', prns),
        apaars.length > 0 ? supabase.from('students').select('apaar_id').in('apaar_id', apaars).not('apaar_id', 'is', null) : Promise.resolve({ data: [] })
      ]);

      const existingPrns = new Set(prnRes.data?.map(d => d.prn_number) || []);
      const existingApaars = new Set(apaarRes.data?.map(d => d.apaar_id) || []);

      for (const row of valid) {
        let isDuplicate = false;
        if (existingPrns.has(row.data.prn_number)) {
          errors.push({ row_number: row.row_number, field: 'PRN', message: 'PRN already exists — skipped' });
          isDuplicate = true;
        } else if (row.data.apaar_id && existingApaars.has(row.data.apaar_id)) {
          errors.push({ row_number: row.row_number, field: 'APAAR ID', message: 'APAAR ID already exists — skipped' });
          isDuplicate = true;
        }

        if (!isDuplicate) {
          finalValid.push(row);
        }
      }
    }

    if (isDryRun) {
      return NextResponse.json({ valid: finalValid, errors, total_rows });
    }

    // --- COMMIT STAGE ---
    
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Data validation failed during commit. Data may have changed since the dry run. Please fix errors and try again.' 
      }, { status: 400 });
    }

    if (finalValid.length === 0) {
      return NextResponse.json({ error: 'No valid rows to commit.' }, { status: 400 });
    }

    const insertData = finalValid.map(row => ({
      ...row.data,
      updated_by: session.user.id
    }));

    // Single database transaction (Postgres statements are atomic)
    const { error: insertError } = await supabase.from('students').insert(insertData);
    
    if (insertError) {
      return NextResponse.json({ error: `Database insert failed: ${insertError.message}` }, { status: 500 });
    }

    // Storage upload
    const timestamp = new Date().getTime();
    const originalFilename = file.name;
    const storagePath = `${session.user.id}/${timestamp}_${originalFilename}`;
    
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'excel-uploads')) {
      await supabase.storage.createBucket('excel-uploads', { public: false });
    }

    const { error: storageError } = await supabase.storage
      .from('excel-uploads')
      .upload(storagePath, buffer, { contentType: file.type });

    let warning = undefined;
    if (storageError) {
      warning = 'Students were added, but the original file could not be archived to Storage.';
    }

    // Audit log
    await supabase.from('uploaded_files').insert({
      uploaded_by: session.user.id,
      file_name: originalFilename,
      storage_path: storageError ? 'upload_failed' : storagePath,
      row_count: total_rows,
      success_count: finalValid.length,
      failed_count: 0,
      status: 'committed'
    });

    return NextResponse.json({ 
      inserted: finalValid.length, 
      skipped: 0,
      warning
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
