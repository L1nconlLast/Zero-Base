export interface AnalyticsEvent {
  name: string;
  timestamp: string;
  userEmail?: string;
  payload?: Record<string, unknown>;
}

const STORAGE_KEY = 'mdz_analytics_events';
const MAX_EVENTS = 500;

const getEvents = (): AnalyticsEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
};

const saveEvents = (events: AnalyticsEvent[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // localStorage cheio ou indisponível
  }
};

export const trackEvent = (
  name: string,
  payload?: Record<string, unknown>,
  options?: { userEmail?: string }
) => {
  const entry: AnalyticsEvent = {
    name,
    timestamp: new Date().toISOString(),
    userEmail: options?.userEmail,
    payload,
  };

  const events = getEvents();
  events.push(entry);
  saveEvents(events);
};

export const analytics = {
  trackEvent,
  getEvents,
  clearEvents: () => localStorage.removeItem(STORAGE_KEY),
};
