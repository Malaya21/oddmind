import { NextResponse, type NextRequest } from 'next/server';
import { createServices } from '@/lib/di';
import { verifyIdToken } from '@/lib/auth/server';
import { handleApiError } from '@/lib/api/handle-api-error';

export async function POST() {
  return NextResponse.json({ data: { isCorrect: false, deprecated: true } });
}

