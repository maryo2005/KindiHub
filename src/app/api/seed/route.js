// ============================================
// API: Seed inicial / Registro de usuario
// POST /api/seed - Crea usuario demo
// ============================================
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    // Verificar si ya existe un usuario
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      return NextResponse.json({ message: 'Ya existe un usuario registrado', user: { email: existingUser.email } });
    }

    // Crear usuario demo
    const hashedPassword = await bcrypt.hash('docente123', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Docente Demo',
        email: 'docente@kindihub.edu.pe',
        password: hashedPassword,
        role: 'docente',
      },
    });

    // Crear aula demo
    const classroom = await prisma.classroom.create({
      data: {
        name: 'Aula Celeste',
        section: 'A',
        age: '5 años',
        year: 2026,
        userId: user.id,
      },
    });

    // Crear estudiantes demo
    const students = await Promise.all([
      'Gabriel Mendoza', 'María Fernanda López', 'Jesús Alejandro Torres',
      'Valentina Castillo', 'Mateo Ramos García', 'Sofía Isabel Paredes',
      'Sebastián Cruz', 'Camila Andrea Vega', 'Diego Alonso Ríos',
      'Lucía Esperanza Flores', 'Thiago Martín Díaz', 'Isabella Reyes',
      'Santiago Morales', 'Emma Victoria Sánchez', 'Leonardo Gutiérrez'
    ].map(name => prisma.student.create({
      data: {
        fullName: name,
        classroomId: classroom.id,
      }
    })));

    // Crear cuaderno de campo demo
    const notebook = await prisma.fieldNotebook.create({
      data: {
        title: 'Cuaderno de Campo - Aula Celeste 2026',
        classroomId: classroom.id,
      },
    });

    // Crear sesión demo
    const session = await prisma.session.create({
      data: {
        activityTitle: 'Cuidamos nuestra planta',
        sessionDate: new Date(),
        area: 'Personal Social',
        competency: 'Convive y participa democráticamente en la búsqueda del bien común',
        standard: 'Convive y participa democráticamente cuando interactúa de manera respetuosa con sus compañeros desde su propia iniciativa.',
        capacities: 'Interactúa con todas las personas|Construye normas y asume acuerdos|Participa en acciones que promueven el bienestar común',
        notebookId: notebook.id,
        status: 'activa',
      },
    });

    // Crear criterios de evaluación
    await Promise.all([
      'Respeta turnos y participa en diálogo',
      'Expresa sus ideas con claridad frente al grupo',
      'Muestra iniciativa para cuidar el ambiente',
      'Colabora con sus compañeros en actividades grupales',
    ].map(desc => prisma.sessionCriteria.create({
      data: {
        description: desc,
        sessionId: session.id,
      }
    })));

    return NextResponse.json({
      message: 'Datos iniciales creados exitosamente',
      credentials: {
        email: 'docente@kindihub.edu.pe',
        password: 'docente123',
      },
      data: {
        user: user.name,
        classroom: classroom.name,
        students: students.length,
        session: session.activityTitle,
      }
    });
  } catch (error) {
    console.error('Error en seed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
