// ============================================
// API: Cuaderno de campo individual - DELETE
// ============================================
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    
    await prisma.fieldNotebook.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Cuaderno de campo eliminado exitosamente' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
