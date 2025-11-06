// /src/utils/PointSystem.js
import { supabase } from '../context/AuthContext';

/**
 * Define as regras de pontuação para todo o app.
 * A "fonte da verdade" da pontuação.
 */
export const POINT_RULES = {
  // Múltipla Escolha
  MC_CORRECT: 5,
  MC_INCORRECT: 2,

  // Cases Práticos
  CASE_CORRECT: 10,
  CASE_PARTIAL: 7,
  CASE_INCORRECT: 3,

  // Interativas (é baseado no score final, mas podemos definir um padrão)
  INTERACTIVE_BASE: 1, 

  // Flash Cards (Recompensa pelo esforço da revisão)
  FLASHCARD_WRONG: 1,  // "Errei"
  FLASHCARD_GOOD: 2,   // "Bom"
  FLASHCARD_EASY: 3,   // "Fácil"
};

/**
 * Helper para pegar a data LOCAL no formato YYYY-MM-DD.
 * Movido da SimuladoPage.js para ser reutilizável.
 */
const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Função centralizada para atualizar o progresso diário e o streak
 * de estudo do usuário no Supabase.
 * * Esta função substitui a lógica duplicada que existia em
 * SimuladoPage.js e StudyCasePage.js.
 * * @param {object} user - O objeto 'user' do useAuth().
 * @param {number} pointsToAdd - O número de pontos a serem adicionados.
 */
export const updateUserProgressAndStreak = async (user, pointsToAdd) => {
  if (!user || pointsToAdd <= 0) {
    console.log("updateUserProgress: Usuário nulo ou sem pontos. Pulando.");
    return;
  }

  try {
    const today = getLocalDateString();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    // =======================================================
    // ☆ INÍCIO DA CORREÇÃO ☆
    // =======================================================
    // 1. Busca os dados MAIS RECENTES do usuário ANTES de calcular.
    // Isso evita usar dados "velhos" (stale) do objeto 'user' do Context.
    const { data: { user: freshUser }, error: getUserError } = await supabase.auth.getUser();

    if (getUserError) throw getUserError;
    if (!freshUser) throw new Error("Não foi possível obter os dados frescos do usuário.");

    // 2. Usa os metadados FRESCOS para o cálculo
    const currentMeta = freshUser.user_metadata || {};
    // =======================================================
    // ☆ FIM DA CORREÇÃO ☆
    // =======================================================
    
    const progress = currentMeta.daily_progress || { date: null, count: 0 };
    const streak = currentMeta.study_streak || { count: 0, lastStudiedDate: null };

    let dataToUpdate = {}; 

    // 3. Atualiza o progresso diário (daily_progress)
    // Se o último progresso foi hoje, soma. Senão, começa de novo com os pontos atuais.
    const newProgressCount = (progress.date === today) 
      ? (progress.count || 0) + pointsToAdd 
      : pointsToAdd;
      
    dataToUpdate.daily_progress = { date: today, count: newProgressCount };

    // 4. Atualiza o streak (study_streak)
    // Só atualiza o streak se for o primeiro estudo do dia.
    if (streak.lastStudiedDate !== today) {
      // Se o último estudo foi ontem, incrementa. Senão, reseta para 1.
      const newStreakCount = (streak.lastStudiedDate === yesterdayString) 
        ? (streak.count || 0) + 1 
        : 1;
        
      dataToUpdate.study_streak = { count: newStreakCount, lastStudiedDate: today };
    }

    // 5. Envia os dados atualizados para o Supabase
    const { error } = await supabase.auth.updateUser({
      data: dataToUpdate
    });

    if (error) {
      throw error;
    }
    
    console.log('Sucesso: Progresso e Streak atualizados.', dataToUpdate);

  } catch (e) { 
    console.error('Erro ao atualizar progresso e streak no Supabase:', e); 
    // Não trava o app se isso falhar, apenas loga o erro
  }
};