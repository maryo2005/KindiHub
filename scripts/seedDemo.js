const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando creación de datos demo...');

  // 1. Limpiar base de datos (opcional, para evitar duplicados si se ejecuta múltiples veces)
  // await prisma.evidenceFile.deleteMany();
  // await prisma.evidence.deleteMany();
  // await prisma.sessionCriteria.deleteMany();
  // await prisma.session.deleteMany();
  // await prisma.fieldNotebook.deleteMany();
  // await prisma.student.deleteMany();
  // await prisma.classroom.deleteMany();

  // 2. Buscar o crear el usuario (docente de prueba)
  const email = 'docente@demo.com';
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    user = await prisma.user.create({
      data: {
        name: 'Ana García (Docente Demo)',
        email: email,
        password: hashedPassword,
        role: 'docente',
      },
    });
    console.log(`✅ Usuario creado: ${user.name} (${user.email})`);
  } else {
    console.log(`ℹ️ Usando usuario existente: ${user.name}`);
  }

  // 3. Crear un Aula de Demo
  const classroom = await prisma.classroom.create({
    data: {
      name: 'Aula Los Exploradores',
      section: 'A',
      age: '4 años',
      year: new Date().getFullYear(),
      userId: user.id,
    },
  });
  console.log(`✅ Aula creada: ${classroom.name}`);

  // 4. Crear Estudiantes
  const studentsData = [
    { fullName: 'Mateo Rojas', dni: '71234567' },
    { fullName: 'Sofía Méndez', dni: '72345678' },
    { fullName: 'Lucas Castro', dni: '73456789' },
    { fullName: 'Valentina López', dni: '74567890' },
  ];

  const students = [];
  for (const s of studentsData) {
    const student = await prisma.student.create({
      data: {
        ...s,
        classroomId: classroom.id,
      },
    });
    students.push(student);
  }
  console.log(`✅ Creados ${students.length} estudiantes`);

  // 5. Crear Cuaderno de Campo Base
  const notebook = await prisma.fieldNotebook.create({
    data: {
      title: 'Cuaderno de Campo Mensual - Octubre',
      classroomId: classroom.id,
    },
  });
  console.log(`✅ Cuaderno de Campo base creado`);

  // 6. Crear Sesiones de Aprendizaje
  const session1 = await prisma.session.create({
    data: {
      activityTitle: 'Explorando los colores de la naturaleza',
      sessionDate: new Date(),
      area: 'Ciencia y Tecnología',
      competency: 'Indaga mediante métodos científicos para construir sus conocimientos',
      standard: 'Explora objetos o fenómenos del entorno, hace preguntas y propone posibles respuestas.',
      capacities: 'Problematiza situaciones|Diseña estrategias|Genera y registra datos',
      notebookId: notebook.id,
      status: 'activa',
    },
  });
  console.log(`✅ Sesión creada: ${session1.activityTitle}`);

  // 7. Criterios de Evaluación para Sesión 1
  const criteria = await prisma.sessionCriteria.createMany({
    data: [
      {
        description: 'Menciona las características (color, forma) de las hojas que recolecta.',
        sessionId: session1.id,
      },
      {
        description: 'Agrupa los elementos recolectados según un criterio propio.',
        sessionId: session1.id,
      },
    ],
  });
  console.log(`✅ Criterios añadidos a la sesión`);

  // Obtener los criterios para asignar a las evidencias
  const sessionCriteriaList = await prisma.sessionCriteria.findMany({ where: { sessionId: session1.id } });

  // 8. Crear algunas evidencias de prueba
  await prisma.evidence.create({
    data: {
      studentId: students[0].id, // Mateo
      sessionId: session1.id,
      criteriaId: sessionCriteriaList[0]?.id,
      type: 'texto',
      level: 'logrado',
      observation: 'Mateo recolectó hojas rojas y amarillas, y explicó detalladamente que se caen por el otoño.',
      status: 'confirmada',
      confirmedAt: new Date(),
      createdBy: user.id,
    },
  });

  await prisma.evidence.create({
    data: {
      studentId: students[1].id, // Sofía
      sessionId: session1.id,
      criteriaId: sessionCriteriaList[1]?.id,
      type: 'texto',
      level: 'proceso',
      observation: 'Agrupó algunas hojas por color, pero al final mezcló las verdes con las marrones. Necesita un poco más de guía para mantener el criterio de agrupación.',
      status: 'confirmada',
      confirmedAt: new Date(),
      createdBy: user.id,
    },
  });

  await prisma.evidence.create({
    data: {
      studentId: students[2].id, // Lucas
      sessionId: session1.id,
      type: 'marcacion',
      level: 'requiere_apoyo',
      competency: 'Indaga mediante métodos científicos',
      observation: 'Marcación rápida: Nivel requiere_apoyo',
      status: 'confirmada',
      confirmedAt: new Date(),
      createdBy: user.id,
    },
  });

  console.log(`✅ Evidencias de prueba creadas`);
  console.log('\n🎉 Datos Demo insertados correctamente.');
  console.log('📧 Credenciales de prueba:');
  console.log('   Usuario: docente@demo.com');
  console.log('   Clave:   123456');
}

main()
  .catch((e) => {
    console.error('Error durante la inserción de datos demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
