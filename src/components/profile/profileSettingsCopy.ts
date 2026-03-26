export type ProfileSettingsLocale = 'pt' | 'en' | 'es';

type CopyTree = {
  page: {
    eyebrow: string;
    title: string;
    subtitle: string;
    syncing: string;
    discard: string;
    save: string;
    saving: string;
  };
  tabs: {
    profile: string;
    stats: string;
    achievements: string;
    preferences: string;
  };
  common: {
    student: string;
    synced: string;
    yes: string;
    no: string;
    fallbackEmail: string;
    emptyValue: string;
  };
  hero: {
    badge: string;
    level: string;
    progressToNextLevel: string;
    xp: string;
  };
  profile: {
    fallbackName: string;
    identityTitle: string;
    verifiedAccount: string;
    displayName: string;
    displayNamePlaceholder: string;
    email: string;
    avatarTitle: string;
    avatarDescription: string;
    uploadAvatar: string;
    save: string;
    saving: string;
  };
  stats: {
    streakTitle: string;
    streakSubtitle: string;
    hoursTitle: string;
    hoursSubtitle: string;
    sessionsTitle: string;
    sessionsSubtitle: string;
    rankingTitle: string;
    rankingSubtitle: string;
    activityTitle: string;
    activitySubtitle: string;
    summaryTitle: string;
    totalMinutes: string;
    totalSessions: string;
    activeDays: string;
    noActivityTitle: string;
    noActivityBody: string;
    less: string;
    more: string;
    daysUnit: string;
    hoursUnit: string;
    sessionsUnit: string;
    globalUnit: string;
  };
  preferences: {
    notifications: string;
    saveNotifications: string;
    savingNotifications: string;
    appearance: string;
    theme: string;
    language: string;
    density: string;
    preferredTime: string;
    themeOptions: Record<'light' | 'dark' | 'system', string>;
    languageOptions: Record<ProfileSettingsLocale, string>;
    densityOptions: Record<'compact' | 'normal' | 'spacious', string>;
    timeOptions: Record<'morning' | 'afternoon' | 'night' | 'late_night', string>;
    notificationStudyReminders: string;
    notificationStudyRemindersDesc: string;
    notificationAchievements: string;
    notificationAchievementsDesc: string;
    notificationGroup: string;
    notificationGroupDesc: string;
    notificationWeekly: string;
    notificationWeeklyDesc: string;
  };
};

const copy: Record<ProfileSettingsLocale, CopyTree> = {
  pt: {
    page: {
      eyebrow: 'Zero Base · Meu Perfil',
      title: 'Configuracoes de perfil',
      subtitle: 'Gerencie sua identidade, metas e preferencias de estudo',
      syncing: 'Sincronizando...',
      discard: 'Descartar',
      save: 'Salvar perfil',
      saving: 'Salvando...',
    },
    tabs: {
      profile: 'Perfil',
      stats: 'Estatisticas',
      achievements: 'Conquistas',
      preferences: 'Preferencias',
    },
    common: {
      student: 'Estudante',
      synced: 'Sincronizado',
      yes: 'Sim',
      no: 'Nao',
      fallbackEmail: 'conta@zero-base.app',
      emptyValue: '--',
    },
    hero: {
      badge: 'Perfil 2.0',
      level: 'NIV.',
      progressToNextLevel: 'Progresso para proximo nivel',
      xp: 'XP',
    },
    profile: {
      fallbackName: 'Estudante',
      identityTitle: 'Identidade',
      verifiedAccount: 'Conta verificada',
      displayName: 'Nome exibido',
      displayNamePlaceholder: 'Como voce quer aparecer',
      email: 'Email',
      avatarTitle: 'Avatar',
      avatarDescription: 'Escolha um icone ou envie uma foto.',
      uploadAvatar: 'Enviar foto (max. 2MB)',
      save: 'Salvar perfil',
      saving: 'Salvando...',
    },
    stats: {
      streakTitle: 'Streak',
      streakSubtitle: 'sequencia atual',
      hoursTitle: 'Horas',
      hoursSubtitle: 'horas estudadas',
      sessionsTitle: 'Sessoes',
      sessionsSubtitle: 'sessoes concluidas',
      rankingTitle: 'Ranking',
      rankingSubtitle: 'posicao global',
      activityTitle: 'Atividade - ultimos 12 meses',
      activitySubtitle: 'Heatmap real por dia',
      summaryTitle: 'Resumo de atividade',
      totalMinutes: 'Minutos acumulados',
      totalSessions: 'Sessoes concluidas',
      activeDays: 'Dias com atividade',
      noActivityTitle: 'Nenhuma atividade de estudo ainda',
      noActivityBody: 'Complete sua primeira sessao para liberar o heatmap e os indicadores reais do perfil.',
      less: 'Menos',
      more: 'Mais',
      daysUnit: 'dias',
      hoursUnit: 'h',
      sessionsUnit: 'sessoes',
      globalUnit: 'global',
    },
    preferences: {
      notifications: 'Notificacoes',
      saveNotifications: 'Salvar notificacoes',
      savingNotifications: 'Salvando notificacoes...',
      appearance: 'Aparencia',
      theme: 'Tema',
      language: 'Idioma',
      density: 'Densidade',
      preferredTime: 'Horario preferido',
      themeOptions: { light: 'Claro', dark: 'Escuro', system: 'Sistema' },
      languageOptions: { pt: 'Portugues', en: 'English', es: 'Espanol' },
      densityOptions: { compact: 'Compacto', normal: 'Normal', spacious: 'Espacoso' },
      timeOptions: { morning: 'Manha', afternoon: 'Tarde', night: 'Noite', late_night: 'Madrugada' },
      notificationStudyReminders: 'Lembretes de estudo',
      notificationStudyRemindersDesc: 'Aviso diario na hora configurada',
      notificationAchievements: 'Conquistas desbloqueadas',
      notificationAchievementsDesc: 'Notifique ao ganhar badges',
      notificationGroup: 'Atividade do grupo',
      notificationGroupDesc: 'Mensagens e novidades nos grupos',
      notificationWeekly: 'Relatorio semanal',
      notificationWeeklyDesc: 'Resumo de desempenho todo domingo',
    },
  },
  en: {
    page: {
      eyebrow: 'Zero Base · My Profile',
      title: 'Profile settings',
      subtitle: 'Manage your identity, goals, and study preferences',
      syncing: 'Syncing...',
      discard: 'Discard',
      save: 'Save profile',
      saving: 'Saving...',
    },
    tabs: {
      profile: 'Profile',
      stats: 'Stats',
      achievements: 'Achievements',
      preferences: 'Preferences',
    },
    common: {
      student: 'Student',
      synced: 'Synced',
      yes: 'Yes',
      no: 'No',
      fallbackEmail: 'account@zero-base.app',
      emptyValue: '--',
    },
    hero: {
      badge: 'Profile 2.0',
      level: 'LVL.',
      progressToNextLevel: 'Progress to next level',
      xp: 'XP',
    },
    profile: {
      fallbackName: 'Student',
      identityTitle: 'Identity',
      verifiedAccount: 'Verified account',
      displayName: 'Display name',
      displayNamePlaceholder: 'How you want to appear',
      email: 'Email',
      avatarTitle: 'Avatar',
      avatarDescription: 'Choose an icon or upload a photo.',
      uploadAvatar: 'Upload photo (max. 2MB)',
      save: 'Save profile',
      saving: 'Saving...',
    },
    stats: {
      streakTitle: 'Streak',
      streakSubtitle: 'current streak',
      hoursTitle: 'Hours',
      hoursSubtitle: 'hours studied',
      sessionsTitle: 'Sessions',
      sessionsSubtitle: 'completed sessions',
      rankingTitle: 'Ranking',
      rankingSubtitle: 'global position',
      activityTitle: 'Activity - last 12 months',
      activitySubtitle: 'Real day-by-day heatmap',
      summaryTitle: 'Activity summary',
      totalMinutes: 'Total minutes',
      totalSessions: 'Completed sessions',
      activeDays: 'Active days',
      noActivityTitle: 'No study activity yet',
      noActivityBody: 'Complete your first session to unlock the heatmap and the real profile indicators.',
      less: 'Less',
      more: 'More',
      daysUnit: 'days',
      hoursUnit: 'h',
      sessionsUnit: 'sessions',
      globalUnit: 'global',
    },
    preferences: {
      notifications: 'Notifications',
      saveNotifications: 'Save notifications',
      savingNotifications: 'Saving notifications...',
      appearance: 'Appearance',
      theme: 'Theme',
      language: 'Language',
      density: 'Density',
      preferredTime: 'Preferred time',
      themeOptions: { light: 'Light', dark: 'Dark', system: 'System' },
      languageOptions: { pt: 'Portuguese', en: 'English', es: 'Spanish' },
      densityOptions: { compact: 'Compact', normal: 'Normal', spacious: 'Spacious' },
      timeOptions: { morning: 'Morning', afternoon: 'Afternoon', night: 'Night', late_night: 'Late night' },
      notificationStudyReminders: 'Study reminders',
      notificationStudyRemindersDesc: 'Daily reminder at the configured time',
      notificationAchievements: 'Unlocked achievements',
      notificationAchievementsDesc: 'Notify when you earn badges',
      notificationGroup: 'Group activity',
      notificationGroupDesc: 'Messages and news from your groups',
      notificationWeekly: 'Weekly report',
      notificationWeeklyDesc: 'Performance summary every Sunday',
    },
  },
  es: {
    page: {
      eyebrow: 'Zero Base · Mi Perfil',
      title: 'Configuracion de perfil',
      subtitle: 'Administra tu identidad, metas y preferencias de estudio',
      syncing: 'Sincronizando...',
      discard: 'Descartar',
      save: 'Guardar perfil',
      saving: 'Guardando...',
    },
    tabs: {
      profile: 'Perfil',
      stats: 'Estadisticas',
      achievements: 'Logros',
      preferences: 'Preferencias',
    },
    common: {
      student: 'Estudiante',
      synced: 'Sincronizado',
      yes: 'Si',
      no: 'No',
      fallbackEmail: 'cuenta@zero-base.app',
      emptyValue: '--',
    },
    hero: {
      badge: 'Perfil 2.0',
      level: 'NIV.',
      progressToNextLevel: 'Progreso al siguiente nivel',
      xp: 'XP',
    },
    profile: {
      fallbackName: 'Estudiante',
      identityTitle: 'Identidad',
      verifiedAccount: 'Cuenta verificada',
      displayName: 'Nombre visible',
      displayNamePlaceholder: 'Como quieres aparecer',
      email: 'Correo',
      avatarTitle: 'Avatar',
      avatarDescription: 'Elige un icono o sube una foto.',
      uploadAvatar: 'Subir foto (max. 2MB)',
      save: 'Guardar perfil',
      saving: 'Guardando...',
    },
    stats: {
      streakTitle: 'Racha',
      streakSubtitle: 'racha actual',
      hoursTitle: 'Horas',
      hoursSubtitle: 'horas estudiadas',
      sessionsTitle: 'Sesiones',
      sessionsSubtitle: 'sesiones completadas',
      rankingTitle: 'Ranking',
      rankingSubtitle: 'posicion global',
      activityTitle: 'Actividad - ultimos 12 meses',
      activitySubtitle: 'Heatmap real por dia',
      summaryTitle: 'Resumen de actividad',
      totalMinutes: 'Minutos acumulados',
      totalSessions: 'Sesiones completadas',
      activeDays: 'Dias con actividad',
      noActivityTitle: 'Todavia no hay actividad de estudio',
      noActivityBody: 'Completa tu primera sesion para activar el heatmap y los indicadores reales del perfil.',
      less: 'Menos',
      more: 'Mas',
      daysUnit: 'dias',
      hoursUnit: 'h',
      sessionsUnit: 'sesiones',
      globalUnit: 'global',
    },
    preferences: {
      notifications: 'Notificaciones',
      saveNotifications: 'Guardar notificaciones',
      savingNotifications: 'Guardando notificaciones...',
      appearance: 'Apariencia',
      theme: 'Tema',
      language: 'Idioma',
      density: 'Densidad',
      preferredTime: 'Horario preferido',
      themeOptions: { light: 'Claro', dark: 'Oscuro', system: 'Sistema' },
      languageOptions: { pt: 'Portugues', en: 'Ingles', es: 'Espanol' },
      densityOptions: { compact: 'Compacto', normal: 'Normal', spacious: 'Espacioso' },
      timeOptions: { morning: 'Manana', afternoon: 'Tarde', night: 'Noche', late_night: 'Madrugada' },
      notificationStudyReminders: 'Recordatorios de estudio',
      notificationStudyRemindersDesc: 'Aviso diario a la hora configurada',
      notificationAchievements: 'Logros desbloqueados',
      notificationAchievementsDesc: 'Avisa cuando ganes insignias',
      notificationGroup: 'Actividad del grupo',
      notificationGroupDesc: 'Mensajes y novedades en los grupos',
      notificationWeekly: 'Reporte semanal',
      notificationWeeklyDesc: 'Resumen de rendimiento cada domingo',
    },
  },
};

export const getProfileSettingsCopy = (locale: ProfileSettingsLocale): CopyTree => {
  return copy[locale] || copy.pt;
};
