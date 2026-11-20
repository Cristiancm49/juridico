import { AlertTriangle, Bot, BriefcaseBusiness, Clock3, ListTree, Send, Sparkles, UserCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../api.js';

const quickQuestions = [
  '¿Qué docente tiene mayor carga?',
  '¿Cuáles son las próximas sesiones?',
  'Muéstrame los compromisos pendientes',
  '¿Qué solicitudes faltan por convertir en caso?',
  'Compara los casos por área',
  '¿Qué documentos faltan?',
];

const welcomeMessage = {
  role: 'assistant',
  text: 'Hola, ¿qué información necesitas consultar?',
  cases: [],
  sections: [],
};

function formatDate(value) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function SectionResults({ sections }) {
  if (!sections?.length) return null;
  return (
    <div className="assistant-sections">
      {sections.map((section, sectionIndex) => (
        <section className="assistant-section" key={`${section.titulo}-${sectionIndex}`}>
          <h3><ListTree size={14} /> {section.titulo}</h3>
          {section.filas?.length ? (
            <div className="assistant-table-wrap">
              <table className="assistant-table">
                <thead><tr>{section.columnas.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                <tbody>
                  {section.filas.map((row, rowIndex) => (
                    <tr key={`${sectionIndex}-${rowIndex}`}>
                      {row.map((value, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{value}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="assistant-empty">No hay registros para mostrar.</p>}
        </section>
      ))}
    </div>
  );
}

function CaseResults({ cases }) {
  if (!cases?.length) return null;
  return (
    <div className="assistant-results">
      {cases.map((item) => (
        <article className={item.retrasado ? 'assistant-case delayed' : 'assistant-case'} key={item.id}>
          <div className="assistant-case-head">
            <span><BriefcaseBusiness size={15} /> {item.numero}</span>
            <strong>{item.estado}</strong>
          </div>
          <div className="assistant-case-grid">
            <span><small>Solicitante</small>{item.solicitante}</span>
            <span><small>Área</small>{item.area}</span>
            <span><small>Responsable</small>{item.responsable}</span>
            <span><small>Última actividad</small>{formatDate(item.ultimaActividad)}</span>
          </div>
          <footer>
            <Clock3 size={14} /> {item.diasSinActividad} días sin actividad
            {item.retrasado && <b><AlertTriangle size={13} /> Retrasado</b>}
          </footer>
        </article>
      ))}
    </div>
  );
}

export function AssistantPage() {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, sending]);

  async function ask(value) {
    const cleanQuestion = value.trim();
    if (!cleanQuestion || sending) return;

    setMessages((current) => [...current, { role: 'user', text: cleanQuestion }]);
    setQuestion('');
    setSending(true);
    try {
      const result = await apiFetch('/api/asistente/consultar', {
        method: 'POST',
        body: JSON.stringify({ pregunta: cleanQuestion }),
      });
      setMessages((current) => [...current, {
        role: 'assistant',
        text: result.respuesta,
        criterion: result.criterio,
        cases: result.casos,
        sections: result.secciones,
        assistedByAi: result.asistidoPorIa,
      }]);
    } catch (error) {
      toast.error(error.message);
      setMessages((current) => [...current, {
        role: 'assistant',
        text: 'No pude consultar los casos en este momento. Intenta nuevamente.',
        cases: [],
        sections: [],
        error: true,
      }]);
    } finally {
      setSending(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    ask(question);
  }

  return (
    <section className="assistant-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ASISTENTE</span>
          <h1>Asistente de casos</h1>
        </div>
      </div>

      <div className="assistant-layout">
        <aside className="assistant-guide panel">
          <div className="assistant-guide-icon"><Sparkles size={21} /></div>
          <h2>¿Qué puedes preguntar?</h2>
          <div className="assistant-prompts">
            {quickQuestions.map((prompt) => (
              <button key={prompt} type="button" onClick={() => ask(prompt)} disabled={sending}>
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <div className="assistant-chat panel">
          <header>
            <div className="assistant-avatar"><Bot size={21} /></div>
            <strong>Asistente del Consultorio</strong>
          </header>

          <div className="assistant-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`assistant-message ${message.role} ${message.error ? 'error' : ''}`} key={`${message.role}-${index}`}>
                {message.role === 'assistant' && <div className="message-avatar"><Bot size={17} /></div>}
                <div className="message-content">
                  <p>{message.text}</p>
                  {message.criterion && <small>{message.criterion}</small>}
                  <CaseResults cases={message.cases} />
                  <SectionResults sections={message.sections} />
                </div>
              </div>
            ))}
            {sending && (
              <div className="assistant-message assistant loading-message">
                <div className="message-avatar"><Bot size={17} /></div>
                <div className="typing"><i /><i /><i /><span>Consultando casos…</span></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="assistant-composer" onSubmit={submit}>
            <UserCheck size={19} />
            <input
              aria-label="Pregunta para el asistente"
              maxLength={500}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ejemplo: ¿Qué docente tiene mayor carga?"
              value={question}
            />
            <button aria-label="Enviar pregunta" disabled={sending || !question.trim()} type="submit">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
