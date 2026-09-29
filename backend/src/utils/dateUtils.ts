/**
 * Utilitários para tratamento seguro de datas escolares e timezone.
 * As reservas utilizam datas no formato 'YYYY-MM-DD' para representar dias letivos específicos
 * evitando discrepâncias causadas por fuso horário UTC em viradas de dia.
 */

export function isValidDateFormat(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr + 'T00:00:00Z'));
}

/**
 * Retorna a data atual no formato 'YYYY-MM-DD' considerando o timezone (ex: America/Sao_Paulo).
 */
export function getTodayDateString(timezone = 'America/Sao_Paulo'): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now); // Retorna 'YYYY-MM-DD'
}

/**
 * Converte string 'YYYY-MM-DD' para objeto Date com horário zerado em UTC
 * para garantir cálculos de diferença de dias consistentes.
 */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Calcula a diferença em dias corridos inteiros entre a data de hoje e a data alvo.
 * Se targetDate for hoje, retorna 0.
 * Se for amanhã, retorna 1.
 * Se for passado, retorna valor negativo.
 */
export function calculateDaysDifference(targetDateStr: string, baseDateStr?: string, timezone = 'America/Sao_Paulo'): number {
  const baseStr = baseDateStr || getTodayDateString(timezone);
  const baseDate = parseDateOnly(baseStr);
  const targetDate = parseDateOnly(targetDateStr);

  const diffMs = targetDate.getTime() - baseDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Retorna o dia da semana:
 * 1 = Segunda-feira
 * 2 = Terça-feira
 * 3 = Quarta-feira
 * 4 = Quinta-feira
 * 5 = Sexta-feira
 * 6 = Sábado
 * 7 = Domingo (ou 0 conforme convenção)
 */
export function getDayOfWeek(dateStr: string): number {
  const date = parseDateOnly(dateStr);
  const jsDay = date.getUTCDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  return jsDay === 0 ? 7 : jsDay;
}

export function getDayOfWeekName(day: number): string {
  const names: Record<number, string> = {
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado',
    7: 'Domingo'
  };
  return names[day] || `Dia ${day}`;
}

/**
 * Calcula o número da semana no mês (1 a 5) para regras semanais de professores.
 */
export function getWeekOfMonth(dateStr: string): number {
  const date = parseDateOnly(dateStr);
  const dayOfMonth = date.getUTCDate();
  return Math.ceil(dayOfMonth / 7);
}

/**
 * Retorna os próximos dias úteis a partir de uma data base.
 */
export function getSchoolDaysInWindow(startDateStr: string, totalWeeks: number): string[] {
  const dates: string[] = [];
  const start = parseDateOnly(startDateStr);
  const totalDays = totalWeeks * 7;

  for (let i = 0; i < totalDays; i++) {
    const current = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfWeek = current.getUTCDay(); // 0 Dom, 6 Sab
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const y = current.getUTCFullYear();
      const m = String(current.getUTCMonth() + 1).padStart(2, '0');
      const d = String(current.getUTCDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
  }

  return dates;
}
