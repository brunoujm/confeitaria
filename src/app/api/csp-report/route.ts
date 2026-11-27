import { NextRequest, NextResponse } from 'next/server';

interface CSPReport {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'disposition': 'enforce' | 'report';
    'blocked-uri': string;
    'line-number': number;
    'column-number': number;
    'source-file': string;
    'script-sample': string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CSPReport;
    const report = body['csp-report'];

    // Log CSP violation for monitoring
    console.warn('[CSP Violation]', {
      directive: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      documentUri: report['document-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
      disposition: report['disposition'],
      timestamp: new Date().toISOString(),
    });

    // In production, you could send to a logging service (Sentry, Datadog, etc.)
    // await sendToLoggingService(report);

    return NextResponse.json({ received: true }, { status: 204 });
  } catch (error) {
    console.error('[CSP Report Error]', error);
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  }
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({
    message: 'CSP Report endpoint active. POST CSP violations here.',
    reportUri: '/api/csp-report',
  });
}