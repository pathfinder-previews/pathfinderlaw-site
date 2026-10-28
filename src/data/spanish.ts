// ============================================================================================
// DRAFT SPANISH. NOT APPROVED FOR THE LIVE SITE.
//
// Every Spanish word the three Spanish pages, the Spanish contact form and the Spanish thank-you
// page show comes from this one file. The wording has NOT been read by a native Spanish speaker
// and Bryn has NOT approved the form wording. It came from an AI first-pass review (the Oct 28
// "Spanish Review - Decisions" document), not from a human reviewer. Until both happen, the
// Spanish pages must not go on the live site (they are built on the `eastern-shore` branch only;
// `eastern-shore-english-only` is the launch candidate).
//
// Where each line came from (the `src` field):
//   ok     the reviewer box in the Oct 28 document said OK; the Spanish column is used as written.
//   note   the reviewer box said Change; the corrected text in the row's note ("Use: ...") is used.
//   round3 a statement the Oct 28 draft shares with an English page that Round 3 has since
//          reworded (employer threshold, 30-day notice, attorney fees). The Spanish here is a NEW
//          translation of the current English, not text from the document. Re-check these first.
//   ui     page furniture with no row in the document (button labels, "English" link, and so on).
//          Needs the same approval as the rest.
// `id` is the row number in the Oct 28 document (ES-V = Virginia, ES-R = Richmond, ES-S = Shore).
//
// To launch the Spanish pages later: have a native speaker read this file, get Bryn's approval of
// SPANISH_FORM.consent and the other form wording, then set SPANISH_DRAFT to false.
// Markup inside strings is the same as the English city data: [text](address) and {phone}.
// ============================================================================================

import type { FormCopy } from './formCopy';

export const SPANISH_DRAFT = true;

export type Src = 'ok' | 'note' | 'round3' | 'ui';
export type Row = { id: string; src: Src; text: string };
// One paragraph (or list item) can join several consecutive rows, as the document ordered them.
export type Text = Row | Row[];
export type Block = Text | { list: Text[] };
export type Section = { h: Row; body: Block[] };
export type SpanishPage = {
  path: string;
  englishPath: string; // the English page this one pairs with (hreflang and the "English" link)
  title: Row;
  description: Row;
  h1: Row;
  intro: Text[];
  sections: Section[];
};

const ok = (id: string, text: string): Row => ({ id, src: 'ok', text });
const note = (id: string, text: string): Row => ({ id, src: 'note', text });
const r3 = (id: string, text: string): Row => ({ id, src: 'round3', text });
const ui = (id: string, text: string): Row => ({ id, src: 'ui', text });

// ---- Current English (Round 3) statements, translated again. Re-check these against the English. ----
// "Virtually all employers with three or more employees regularly in service in Virginia are
//  required to carry workers' compensation insurance."
const THRESHOLD = 'Prácticamente todos los empleadores que tienen regularmente a tres o más empleados a su servicio en Virginia están obligados a tener un seguro de compensación al trabajador.';
// "The Virginia Workers' Compensation Act requires you to give notice to your employer within
//  thirty days of the accident, although exceptions exist."
const NOTICE = 'Avise a su empleador. La Ley de Compensación al Trabajador de Virginia exige que usted avise a su empleador dentro de los treinta días siguientes al accidente, aunque existen excepciones.';
// "The Virginia Workers' Compensation Commission must approve all attorney fees in Workers' Comp
//  cases. We are generally paid on contingency, meaning we collect attorney fees from the benefits
//  we obtain for our clients. Costs we advance are subject to reimbursement from the client."
const FEE_1 = 'La Comisión de Compensación al Trabajador de Virginia debe aprobar todos los honorarios de abogado en los casos de compensación al trabajador.';
const FEE_2 = 'Por lo general, se nos paga por contingencia, es decir, cobramos los honorarios de abogado de los beneficios que obtenemos para nuestros clientes.';
const FEE_3 = 'Los costos que adelantamos están sujetos a reembolso por parte del cliente.';
const fees = (id: string): Row[] => [r3(id, FEE_1), r3(id, FEE_2), r3(id, FEE_3)];

const INTERPRETER = 'Podemos coordinar un intérprete o un servicio de traducción para su consulta.';

// ------------------------------------------------------------------ Page A: Virginia
const A = '/abogados-de-compensacion-al-trabajador-en-virginia/';
const B = '/abogados-de-compensacion-al-trabajador-en-richmond/';
const C = '/abogados-de-compensacion-al-trabajador-en-la-costa-este-de-virginia/';

export const spanishPages: SpanishPage[] = [
  {
    path: A,
    englishPath: '/virginia-workers-comp-lawyer/',
    title: note('ES-V-01', 'Abogados de compensación al trabajador en Virginia'),
    description: ok('ES-V-02', '¿Se lastimó en el trabajo en Virginia? Pathfinder Injury Law atiende casos de compensación al trabajador. Consulta gratis: 804-505-0633.'),
    h1: note('ES-V-03', 'Abogados de compensación al trabajador en Virginia'),
    intro: [
      [
        note('ES-V-04', 'Si usted se lastimó en el trabajo en Virginia, es posible que tenga derecho a beneficios de compensación al trabajador que ayudan a cubrir su atención médica y una parte del sueldo que deja de recibir.'),
        note('ES-V-05', 'Pathfinder Injury Law atiende a clientes de todas partes de Virginia. Tenemos oficinas en Richmond y en Chincoteague, donde atendemos solo con cita, y ofrecemos consultas por video.'),
      ],
      ok('ES-V-06', INTERPRETER),
    ],
    sections: [
      {
        h: ok('ES-V-07', 'Compensación al trabajador en Virginia'),
        body: [
          r3('ES-V-08', THRESHOLD),
          note('ES-V-09', 'Los trabajadores del campo y de horticultura, como los de viveros e invernaderos, tienen cobertura de compensación al trabajador solo si el empleador tiene regularmente más de tres empleados de tiempo completo. Si usted trabaja en el campo, en una granja o en una empresa que procesa productos agrícolas, los detalles de su trabajo son importantes. Cuéntenos qué hace y quién le paga, y podemos ayudarle a entender su situación.'),
          note('ES-V-10', 'Aun así, usted podría presentar un reclamo de compensación al trabajador sin importar su estatus migratorio.'),
        ],
      },
      {
        h: ok('ES-V-11', 'Qué hacer después de una lesión en el trabajo'),
        body: [
          {
            list: [
              [r3('ES-V-12', NOTICE), ok('ES-V-13', 'Lo mejor es avisar por escrito.')],
              note('ES-V-14', 'Busque atención médica. Dígales a todos los médicos, enfermeras y clínicas que lo atiendan que su lesión ocurrió en el trabajo.'),
              ok('ES-V-15', 'Documente lo que pasó. Si puede, tome fotos del lugar del accidente y de sus lesiones, y anote todo lo que recuerde.'),
              note('ES-V-16', 'Tenga en cuenta el plazo para presentar su reclamo. Su reclamo debe estar presentado ante la Comisión de Compensación al Trabajador de Virginia (Virginia Workers’ Compensation Commission) dentro de los dos años siguientes a la fecha de su accidente, aunque existen excepciones.'),
            ],
          },
        ],
      },
      {
        h: ok('ES-V-17', 'Si le niegan su reclamo'),
        body: [
          [
            note('ES-V-18', 'Si le niegan su reclamo, usted tiene derecho a oponerse a esa decisión y a llevar su reclamo a una audiencia ante la Comisión de Compensación al Trabajador de Virginia.'),
            note('ES-V-19', 'Un abogado puede ayudarle a revisar el motivo del rechazo y a prepararse para la audiencia.'),
          ],
        ],
      },
      {
        h: ok('ES-V-20', 'Nuestras oficinas'),
        body: [
          ok('ES-V-21', 'Tenemos dos oficinas, y ambas atienden solo con cita.'),
          { list: [ok('ES-V-22', 'Richmond: 8010 Ridge Road, Suite A, Richmond, VA 23229.'), ok('ES-V-23', 'Chincoteague: 6294 Cropper Street, Chincoteague, VA 23336.')] },
          [ok('ES-V-24', 'El horario es de lunes a viernes, de 9 a. m. a 5 p. m.; los fines de semana, con cita previa.'), ok('ES-V-25', 'Ofrecemos consultas por video.')],
        ],
      },
      {
        h: ok('ES-V-26', 'La Costa Este de Virginia (Eastern Shore)'),
        body: [
          ok('ES-V-27', 'Si usted trabaja en la Costa Este de Virginia, nuestra oficina de Chincoteague atiende a clientes en los condados de Accomack y Northampton.'),
          ok('ES-V-28', `[Vea nuestra página sobre la Costa Este de Virginia.](${C})`),
        ],
      },
      {
        h: ok('ES-V-29', 'Llame hoy a un abogado de compensación al trabajador'),
        body: [
          [ok('ES-V-30', 'Ofrecemos una consulta gratis para responder sus preguntas.'), ...fees('ES-V-31/32')],
          ok('ES-V-33', 'Para hablar con nuestro equipo, llame al {phone} o llene el formulario de abajo.'),
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- Page B: Richmond
  {
    path: B,
    englishPath: '/richmond-workers-comp-lawyer/',
    title: note('ES-R-01', 'Abogados de compensación al trabajador en Richmond'),
    description: ok('ES-R-02', '¿Se lastimó en el trabajo en Richmond? Pathfinder Injury Law atiende casos de compensación al trabajador. Consulta gratis: 804-505-0633.'),
    h1: note('ES-R-03', 'Abogados de compensación al trabajador en Richmond'),
    intro: [
      [
        note('ES-R-04', 'Si usted se lastimó en el trabajo en Richmond, es posible que tenga derecho a beneficios de compensación al trabajador que ayudan a cubrir su atención médica y una parte del sueldo que deja de recibir.'),
        note('ES-R-05', 'Pathfinder Injury Law puede ayudarle en este momento difícil. Llame al {phone} o llene nuestro formulario en línea para una consulta gratis, y así podrá concentrarse en su recuperación.'),
      ],
      ok('ES-R-06', INTERPRETER),
    ],
    sections: [
      {
        h: ok('ES-R-07', 'Para qué sirve la compensación al trabajador'),
        body: [
          note('ES-R-08', 'Ya sea en Richmond, Mechanicsville, Midlothian o en cualquier otra parte de Virginia, la compensación al trabajador ofrece beneficios para cubrir los gastos médicos y el sueldo perdido después de una lesión relacionada con el trabajo.'),
          r3('ES-R-09', THRESHOLD),
          note('ES-R-10', 'Aun así, usted podría presentar un reclamo de compensación al trabajador sin importar su estatus migratorio.'),
        ],
      },
      {
        h: ok('ES-R-11', 'Qué beneficios existen'),
        body: [
          note('ES-R-12', 'Beneficios médicos: la compensación al trabajador debe cubrir todos los gastos médicos razonables y necesarios que sean consecuencia de su lesión de trabajo, incluidas consultas, procedimientos, medicamentos, terapia y otros costos, como el kilometraje de ida y vuelta a las citas médicas.'),
          note('ES-R-13', 'Beneficios por sueldo perdido: si un médico dice que usted no puede trabajar en absoluto durante un período temporal a causa de sus lesiones, es posible que reciba dos tercios de su salario semanal promedio antes de la lesión, hasta una tasa semanal máxima de compensación.'),
          note('ES-R-14', 'Los beneficios también pueden incluir pagos por incapacidad parcial permanente y beneficios por fallecimiento.'),
        ],
      },
      {
        h: ok('ES-R-15', 'Qué hacer después de una lesión en el trabajo'),
        body: [
          {
            list: [
              [r3('ES-R-16', NOTICE), ok('ES-R-17', 'Lo mejor es avisar por escrito.')],
              note('ES-R-18', 'Busque atención médica. Dígales a todos los médicos, enfermeras y clínicas que lo atiendan que su lesión ocurrió en el trabajo.'),
              ok('ES-R-19', 'Documente lo que pasó. Si puede, tome fotos del lugar del accidente y de sus lesiones, y anote todo lo que recuerde.'),
              note('ES-R-20', 'Tenga en cuenta el plazo para presentar su reclamo. Su reclamo debe estar presentado ante la Comisión de Compensación al Trabajador de Virginia (Virginia Workers’ Compensation Commission) dentro de los dos años siguientes a la fecha de su accidente, aunque existen excepciones.'),
            ],
          },
        ],
      },
      {
        h: ok('ES-R-21', 'Si le niegan su reclamo'),
        body: [
          [
            note('ES-R-22', 'Si le niegan su reclamo, usted tiene derecho a oponerse a esa decisión y a llevar su reclamo a una audiencia ante la Comisión de Compensación al Trabajador de Virginia.'),
            note('ES-R-23', 'Un abogado puede ayudarle a revisar el motivo del rechazo y a prepararse para la audiencia.'),
          ],
        ],
      },
      {
        h: ok('ES-R-24', 'Cómo prepararse para la consulta'),
        body: [
          ok('ES-R-25', 'Antes de su consulta, reúna estos documentos para ayudarnos a entender su situación:'),
          {
            list: [
              note('ES-R-26', 'Expedientes médicos, incluidas las notas del médico sobre si usted puede trabajar y los resúmenes de las citas.'),
              ok('ES-R-27', 'Facturas médicas.'),
              note('ES-R-28', 'Comunicaciones con su empleador, incluidos los reportes del accidente y la lista de médicos (panel de médicos) que le dio su empleador.'),
              ok('ES-R-29', 'Comunicaciones con la compañía de seguros.'),
              ok('ES-R-30', 'Cualquier documento de la Comisión de Compensación al Trabajador de Virginia.'),
            ],
          },
          ok('ES-R-31', 'Mientras más detalles pueda darnos, con más precisión podremos evaluar su caso.'),
        ],
      },
      {
        h: ok('ES-R-32', 'Nuestra oficina en Richmond'),
        body: [
          ok('ES-R-33', 'Nuestra oficina de Richmond está en 8010 Ridge Road, Suite A, Richmond, VA 23229. Atendemos solo con cita.'),
          [ok('ES-R-34', 'El horario es de lunes a viernes, de 9 a. m. a 5 p. m.; los fines de semana, con cita previa.'), ok('ES-R-35', 'Ofrecemos consultas por video.')],
        ],
      },
      {
        h: ok('ES-R-36', 'Llame hoy a un abogado de compensación al trabajador en Richmond'),
        body: [
          [ok('ES-R-37', 'Ofrecemos una consulta gratis para responder sus preguntas.'), ...fees('ES-R-38/39')],
          ok('ES-R-40', 'Para hablar con nuestro equipo, llame al {phone} o llene el formulario de abajo.'),
        ],
      },
    ],
  },

  // ------------------------------------------------------------- Page C: Eastern Shore
  {
    path: C,
    englishPath: '/eastern-shore-workers-comp-lawyer/',
    title: note('ES-S-01', 'Abogados de compensación al trabajador | Eastern Shore, VA'),
    description: ok('ES-S-02', '¿Se lastimó en el trabajo en la Costa Este de Virginia? Pathfinder Injury Law tiene una oficina en Chincoteague. Consulta gratis: 804-505-0633.'),
    h1: note('ES-S-03', 'Abogados de compensación al trabajador en la Costa Este de Virginia (Eastern Shore)'),
    intro: [
      [
        note('ES-S-04', 'Si usted se lastimó en el trabajo en la Costa Este de Virginia (Eastern Shore), es posible que tenga derecho a beneficios de compensación al trabajador que ayudan a cubrir su atención médica y una parte del sueldo que deja de recibir.'),
        ok('ES-S-05', 'Pathfinder Injury Law tiene una oficina en Chincoteague y atiende a clientes en los condados de Accomack y Northampton.'),
      ],
      [
        ok('ES-S-06', 'El trabajo en la Costa Este puede ser duro para el cuerpo.'),
        note('ES-S-07', 'Las plantas procesadoras de pollo y de mariscos, el trabajo en el campo y en la acuicultura, la construcción y los empleos de temporada en turismo, hoteles y restaurantes tienen riesgos reales de lesión.'),
        note('ES-S-08', 'Cuando usted se lastima, las preguntas llegan rápido: ¿quién paga el tratamiento?, ¿qué pasa con mi sueldo?, ¿qué hago si la aseguradora dice que no?'),
      ],
      ok('ES-S-09', 'Nuestro equipo puede explicarle el proceso del reclamo paso a paso, empezando con una consulta gratis, para que usted pueda concentrarse en su recuperación.'),
      ok('ES-S-10', INTERPRETER),
    ],
    sections: [
      {
        h: ok('ES-S-11', 'Compensación al trabajador para empleados de la Costa Este'),
        body: [
          [
            r3('ES-S-12', THRESHOLD),
            note('ES-S-13', 'Si tiene dudas sobre si su empleador está obligado a tener este seguro, o sobre si su trabajo está cubierto, llámenos y le ayudaremos a averiguarlo.'),
          ],
          note('ES-S-14', 'Los trabajadores del campo y de horticultura, como los de viveros e invernaderos, tienen cobertura de compensación al trabajador solo si el empleador tiene regularmente más de tres empleados de tiempo completo. Si usted trabaja en el campo, en una granja o en una empresa que procesa productos agrícolas, los detalles de su trabajo son importantes. Cuéntenos qué hace y quién le paga, y podemos ayudarle a entender su situación.'),
          note('ES-S-15', 'Aun así, usted podría presentar un reclamo de compensación al trabajador sin importar su estatus migratorio.'),
        ],
      },
      {
        h: ok('ES-S-16', 'Lesiones comunes en el trabajo'),
        body: [
          ok('ES-S-17', 'Algunos ejemplos de lesiones de trabajo:'),
          {
            list: [
              ok('ES-S-18', 'Resbalones y caídas en pisos mojados o resbalosos.'),
              ok('ES-S-19', 'Lesiones con maquinaria, cuchillos o bandas transportadoras.'),
              ok('ES-S-20', 'Cortaduras y quemaduras.'),
              ok('ES-S-21', 'Lesiones de espalda, hombro y cuello al levantar cargas pesadas.'),
              ok('ES-S-22', 'Fracturas y lesiones por aplastamiento.'),
              ok('ES-S-23', 'Caídas desde escaleras, techos o andamios.'),
              note('ES-S-24', 'Accidentes de tránsito mientras maneja por trabajo.'),
            ],
          },
          ok('ES-S-25', 'Más información (en inglés): [accidentes en fábricas](/virginia-factory-accident-lawyer/), [accidentes de construcción](/virginia-construction-accident-lawyer/), [accidentes con vehículos de trabajo](/car-accident-at-work-in-virginia/) y [lesiones de espalda](/virginia-workers-comp-lawyer/virginia-back-injury-lawyer/).'),
        ],
      },
      {
        h: ok('ES-S-26', 'Qué hacer después de una lesión en el trabajo'),
        body: [
          {
            list: [
              [r3('ES-S-27', NOTICE), ok('ES-S-28', 'Lo mejor es avisar por escrito.')],
              note('ES-S-29', 'Busque atención médica. Dígales a todos los médicos, enfermeras y clínicas que lo atiendan que su lesión ocurrió en el trabajo.'),
              ok('ES-S-30', 'Documente lo que pasó. Si puede, tome fotos del lugar del accidente y de sus lesiones, y anote todo lo que recuerde.'),
              note('ES-S-31', 'Tenga en cuenta el plazo para presentar su reclamo. Su reclamo debe estar presentado ante la Comisión de Compensación al Trabajador de Virginia (Virginia Workers’ Compensation Commission) dentro de los dos años siguientes a la fecha de su accidente, aunque existen excepciones.'),
            ],
          },
        ],
      },
      {
        h: ok('ES-S-32', 'Si le niegan su reclamo'),
        body: [
          [
            note('ES-S-33', 'Si le niegan su reclamo, usted tiene derecho a oponerse a esa decisión y a llevar su reclamo a una audiencia ante la Comisión de Compensación al Trabajador de Virginia.'),
            note('ES-S-34', 'Un abogado puede ayudarle a revisar el motivo del rechazo y a prepararse para la audiencia.'),
            note('ES-S-35', 'Más información (en inglés): [cómo apelar un rechazo](/how-to-appeal-a-workers-comp-denial-in-virginia/).'),
          ],
        ],
      },
      {
        h: ok('ES-S-36', 'Nuestra oficina en Chincoteague y consultas por video'),
        body: [
          [
            ok('ES-S-37', 'Nuestra oficina en Chincoteague está en 6294 Cropper Street, Chincoteague, VA 23336.'),
            ok('ES-S-38', 'Atendemos solo con cita, y ofrecemos consultas por video para que usted pueda hablar con nuestro equipo desde su casa.'),
          ],
          ok('ES-S-39', 'El horario es de lunes a viernes, de 9 a. m. a 5 p. m.; los fines de semana, con cita previa.'),
        ],
      },
      {
        h: ok('ES-S-40', 'Llame hoy a un abogado de compensación al trabajador en la Costa Este'),
        body: [
          [ok('ES-S-42', 'Ofrecemos una consulta gratis para responder sus preguntas.'), ...fees('ES-S-43/44')],
          note('ES-S-41', 'Atendemos a clientes de toda la Costa Este de Virginia, incluidos Chincoteague, Accomac, Onancock, Parksley, Wachapreague, Onley, Melfa, Exmore, Nassawadox, Cape Charles y Eastville.'),
          ok('ES-S-45', 'Para hablar con nuestro equipo, llame al {phone} o llene el formulario de abajo.'),
        ],
      },
    ],
  },
];

export const spanishPageByPath = (path: string) => {
  const p = spanishPages.find((x) => x.path === path);
  if (!p) throw new Error(`No Spanish data for ${path}`);
  return p;
};

// The line on the English Eastern Shore page that points to Spanish page C (row ES-E-01, marked OK).
export const ES_E_01 = ok(
  'ES-E-01',
  `¿Habla español? Lea esta página en español: [Abogados de compensación al trabajador en la Costa Este de Virginia](${C}).`,
);

// English page <-> Spanish page pairs, used for the hreflang links in every page head.
export const languagePairs = spanishPages.map((p) => ({ english: p.englishPath, spanish: p.path }));

// ---------------------------------------------------------------- page furniture (src: ui)
// None of this has a row in the Oct 28 document. Same approval needed as the rest.
export const SPANISH_UI = {
  englishLink: ui('UI-01', 'English'),
  onThisPage: ui('UI-02', 'En esta página'),
  sideHeading: ui('UI-03', 'Consulta gratis'),
  sideButton: ui('UI-04', 'Hablar con nosotros'),
  ctaPoints: ui('UI-05', 'Sin compromiso'), // "No Pressure"
  ctaHeading: ui('UI-06', 'Consulta gratis'), // "Free Consultation"
  ctaLede: ui('UI-07', 'Vea cómo podemos ayudarle con su caso de compensación al trabajador.'),
  thanksTitle: ui('UI-08', 'Gracias - Pathfinder Injury Law'),
  thanksDescription: ui('UI-09', 'Pathfinder Injury Law ofrece una consulta gratis y sin compromiso.'),
  thanksHeading: ui('UI-10', 'Gracias'),
  thanksBody: ui('UI-11', 'Gracias. Su mensaje ha sido enviado. Nos comunicaremos con usted pronto. Si desea comunicarse de inmediato, llame a nuestra oficina al {phone}.'),
  thanksButton: ui('UI-12', 'Volver al inicio'),
};

// ---------------------------------------------------------------- Spanish contact form (DRAFT)
// NEEDS BRYN'S APPROVAL. `consent` must carry exactly the meaning of the approved English:
// "I understand sending this form does not make me a client or create an attorney-client
//  relationship, and Pathfinder Injury Law has not agreed to represent me."
export const SPANISH_FORM: FormCopy = {
  heading: 'Hable con nosotros',
  name: 'Nombre',
  email: 'Correo electrónico',
  phone: 'Número de teléfono',
  message: 'Mensaje',
  hint: 'Por favor, sea breve. Por ahora, no incluya detalles confidenciales ni sensibles.',
  consent:
    'Entiendo que enviar este formulario no me convierte en cliente ni crea una relación abogado-cliente, y que Pathfinder Injury Law no ha aceptado representarme.',
  honeypot: 'Empresa',
  button: 'Enviar consulta',
  invalid: 'Por favor, complete todos los campos marcados con asterisco, incluida la confirmación.',
  waiting: 'Un momento, estamos verificando su navegador. Por favor, presione Enviar consulta otra vez.',
  sending: 'Enviando...',
  failurePrefix: 'No pudimos enviar su mensaje. Por favor, llámenos al ',
  failureSuffix: ' y le ayudaremos de inmediato.',
  badRequest: 'Por favor, revise que todos los campos estén completos y que la confirmación esté marcada.',
  previewFallback: 'Vista previa: no se envió nada.',
  thankYou: '/gracias/',
};
