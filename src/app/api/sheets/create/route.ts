import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleToken } from '@/lib/google/auth';
import { createSpreadsheet } from '@/lib/google/sheets';
import { initializeSpreadsheet } from '@/lib/spreadsheet-setup';
import { DEFAULT_CATEGORIES } from '@/lib/default-categories';
import { UserSettings } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { companyName, startDate, vatSales, vatExpenses } = await request.json();

    if (!companyName || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const googleToken = await getGoogleToken();

    // Create spreadsheet
    const spreadsheetId = await createSpreadsheet(googleToken, companyName);

    // Prepare user settings
    const userSettings: UserSettings = {
      id: '',
      userId: user.id,
      spreadsheetId,
      companyName,
      startDate,
      vatSales: vatSales || 21,
      vatExpenses: vatExpenses || 21,
      forecastMode: 'SIMPLE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Initialize spreadsheet structure
    await initializeSpreadsheet(googleToken, spreadsheetId, userSettings, DEFAULT_CATEGORIES);

    // Save user settings to Supabase
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Ensure startDate is a valid date (add -01 if only year-month)
    const fullStartDate = startDate.length === 7 ? `${startDate}-01` : startDate;

    // Convert VAT from percentage (21) to decimal (0.21) for DB storage
    const vatSalesDecimal = (vatSales || 21) / 100;
    const vatExpensesDecimal = (vatExpenses || 21) / 100;

    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({
          spreadsheet_id: spreadsheetId,
          company_name: companyName,
          start_date: fullStartDate,
          vat_sales: vatSalesDecimal,
          vat_expenses: vatExpensesDecimal,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (updateError) {
        console.error('Error updating user_settings:', updateError);
        throw updateError;
      }
    } else {
      // Insert new settings
      const { error: insertError } = await supabase.from('user_settings').insert({
        user_id: user.id,
        spreadsheet_id: spreadsheetId,
        company_name: companyName,
        start_date: fullStartDate,
        vat_sales: vatSalesDecimal,
        vat_expenses: vatExpensesDecimal,
        forecast_mode: 'SIMPLE',
      });
      if (insertError) {
        console.error('Error inserting user_settings:', insertError);
        throw insertError;
      }
    }

    return NextResponse.json({ spreadsheetId });
  } catch (error) {
    console.error('Create spreadsheet error:', error);
    return NextResponse.json(
      { error: 'Failed to create spreadsheet' },
      { status: 500 }
    );
  }
}
