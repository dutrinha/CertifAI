// certifai-mvp/src/pages/ProgressPage.js
// (VERSÃO FINAL - Com Filtro de Stats por Prova)
import React, { useState, useCallback, useEffect } from 'react'; 
import { 
    View, 
    Text, 
    StyleSheet, 
    SafeAreaView, 
    Platform, 
    ScrollView,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Modal, 
    TouchableWithoutFeedback 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../context/AuthContext';
import { 
    ListChecks,     // M.E.
    Briefcase,      // Case
    Zap,            // Interativa
    Target,         // Acerto
    Brain,          // Ponto a Melhorar
    ClipboardList,  // Simulado Completo
    ChevronRight,
    ChevronDown   
} from 'lucide-react-native';

// Paleta de Cores
const cores = {
    primary: "#00C853",
    primaryLight: "#E6F8EB",
    textPrimary: "#1A202C",
    textSecondary: "#64748B",
    textLight: "#FFFFFF",
    background: "#F7FAFC",
    cardBackground: "#FFFFFF",
    border: "#E2E8F0",
    shadow: 'rgba(0, 0, 0, 0.05)',
    greenText: '#16A34A', 
    redText: '#DC2626',   
    orange: '#F59E0B',
    orangeLight: '#FFFBEB',
};

// --- FUNÇÕES HELPER ---
function formatHistoryDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const optionsTime = { hour: '2-digit', minute: '2-digit' };
    const optionsDate = { day: '2-digit', month: '2-digit', year: '2-digit' };
    if (date.toDateString() === today.toDateString()) {
        return `Hoje, ${date.toLocaleTimeString('pt-BR', optionsTime)}h`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return `Ontem, ${date.toLocaleTimeString('pt-BR', optionsTime)}h`;
    }
    return date.toLocaleDateString('pt-BR', optionsDate);
}
function formatHistoryTitle(item) {
    if (item.type === 'Completo') return `Simulado Completo ${item.certification || ''}`;
    if (item.type === 'M.E.') return `M.E. - ${item.topic_title || item.certification || ''}`;
    if (item.type === 'Case') return `Case Prático ${item.certification || ''}`;
    if (item.type === 'Interativa') return `Interativa: ${item.topic_title || ''}`;
    return 'Simulado Concluído';
}
// ---------------------------------


// --- COMPONENTES DA UI ---
const StatCard = ({ icon: Icon, value, label }) => (
    <View style={styles.statCard}>
        <View style={styles.statIconContainer}>
            <Icon size={22} color={cores.primary} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);
const FocusCard = ({ icon: Icon, value, label }) => (
    <View style={[styles.card, styles.focusCard]}>
        <View style={styles.focusIconContainer}>
            <Icon size={24} color={cores.orange} />
        </View>
        <View style={{flex: 1}}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.focusValue}>{value}</Text>
        </View>
    </View>
);
const HistoryItem = ({ item, onPress }) => {
    let Icon = ListChecks;
    if (item.type === 'Completo') Icon = ClipboardList;
    if (item.type === 'Case') Icon = Briefcase;
    if (item.type === 'Interativa') Icon = Zap;
    return (
        <TouchableOpacity style={styles.historyItem} onPress={() => onPress(item)}>
            <View style={[styles.historyIconContainer, { backgroundColor: cores.primaryLight }]}>
                <Icon size={20} color={cores.primary} />
            </View>
            <View style={styles.historyTextContainer}>
                <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.historyDate}>{item.date}</Text>
            </View>
            <View style={styles.historyResultContainer}>
                <Text style={[styles.historyResultText, item.is_success ? styles.greenText : styles.redText]}>
                    {item.result}
                </Text>
            </View>
            <ChevronRight size={20} color={cores.textSecondary} />
        </TouchableOpacity>
    );
};

const TopicStatItem = ({ item }) => {
  const accuracy = (item.total_questions > 0) 
    ? (item.correct_questions / item.total_questions) * 100 
    : 0;
  let barColor = cores.greenText;
  if (accuracy < 70) barColor = cores.orange;
  if (accuracy < 50) barColor = cores.redText;

  return (
    <View style={styles.topicStatItem}>
      <View style={styles.topicStatHeader}>
        <Text style={styles.topicStatName} numberOfLines={1}>
          {item.topic}
        </Text>
        <Text style={[styles.topicStatAccuracy, { color: barColor }]}>
          {accuracy.toFixed(0)}%
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFg, { width: `${accuracy}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.topicStatNumbers}>
        {item.correct_questions} / {item.total_questions} corretas
      </Text>
    </View>
  );
};
// ---------------------------------


export default function ProgressPage() {
    const navigation = useNavigation();
    const { user } = useAuth();
    
    // --- ESTADOS ---
    const [loading, setLoading] = useState(true);
    const [historyList, setHistoryList] = useState([]);
    // Estado inicial padrão (vai ser atualizado logo em seguida)
    const [statsData, setStatsData] = useState([ 
        { id: '1', icon: ListChecks, value: '...', label: 'M.E. Feitas' },
        { id: '2', icon: Briefcase, value: '...', label: 'Cases Feitos' },
        { id: '3', icon: Zap, value: '...', label: 'Interativas' },
        { id: '4', icon: Target, value: '...%', label: 'Taxa de Acerto' },
    ]);
    const [focusTopic, setFocusTopic] = useState("Calculando...");
    const [topicStats, setTopicStats] = useState([]);
    const [filtroProva, setFiltroProva] = useState('Todos'); 
    
    // Lista de provas (ATUALIZADA)
    const PROVAS = ['Todos', 'cpa10', 'cpa20', 'cea', 'cpa', 'cpror', 'cproi'];
    
    const [modalVisible, setModalVisible] = useState(false);
    // ---------------


    // --- FUNÇÃO PRINCIPAL DE BUSCA DE DADOS ---
    const loadProgressData = useCallback(async () => {
        if (!user) return; 

        setLoading(true);
        setFocusTopic("Calculando..."); 
        setTopicStats([]); 
        
        try {
            const [
                historyResult, 
                statsResult, 
                weakestTopicResult, 
                topicStatsResult
            ] = await Promise.all([
                // 1. Histórico
                supabase
                    .from('simulado_sessions')
                    .select('*')
                    .eq('user_id', user.id) 
                    .order('created_at', { ascending: false }) 
                    .limit(20)
                    .ilike('certification', filtroProva === 'Todos' ? '%' : filtroProva),
                
                // 2. Stats Gerais
                supabase.rpc('get_user_progress_stats', { p_prova: filtroProva }),
                
                // 3. Ponto Fraco
                supabase.rpc('get_weakest_topic_by_prova', { p_prova: filtroProva }),

                // 4. Stats por Tópico
                supabase.rpc('fn_get_topic_accuracy_stats', {
                    p_user_id: user.id,
                    p_prova: filtroProva
                })
            ]);

            // --- Processa Histórico ---
            if (historyResult.error) throw historyResult.error;
            const formattedHistory = (historyResult.data || []).map(item => ({
                id: item.id,
                type: item.type,
                ...item, 
                title: formatHistoryTitle(item), 
                date: formatHistoryDate(item.created_at), 
                result: item.result_display,
                is_success: item.is_success,
            }));
            setHistoryList(formattedHistory);
            
            // =======================================================
            // ☆ INÍCIO DA MUDANÇA (Filtro de Stats) ☆
            // =======================================================
            // --- Processa Stats Gerais (com filtro) ---
            if (statsResult.error) throw statsResult.error;
            if (statsResult.data) {
                const stats = statsResult.data;
                
                // 1. Define todos os cards possíveis
                const allStatsCards = [
                    { id: '1', icon: ListChecks, value: String(stats.mc_total || 0), label: 'M.E. Feitas' },
                    { id: '2', icon: Briefcase, value: String(stats.case_total || 0), label: 'Cases Feitos' },
                    { id: '3', icon: Zap, value: String(stats.interactive_total || 0), label: 'Interativas' },
                    { id: '4', icon: Target, value: `${stats.accuracy_percent || 0}%`, label: 'Taxa de Acerto' },
                ];
                
                // 2. Define quais são as provas clássicas
                const provasClassicas = ['cpa10', 'cpa20', 'cea'];
                const isProvaClassica = provasClassicas.includes(filtroProva);
                
                let finalStatsData;
                
                if (isProvaClassica) {
                    // 3. Se for clássica, filtra
                    finalStatsData = allStatsCards.filter(card => 
                        card.label === 'M.E. Feitas' || card.label === 'Taxa de Acerto'
                    );
                } else {
                    // 4. Senão (Todos, cpa, cpror...), mostra tudo
                    finalStatsData = allStatsCards;
                }
                
                setStatsData(finalStatsData);
            }
            // =======================================================
            // ☆ FIM DA MUDANÇA (Filtro de Stats) ☆
            // =======================================================
            
            // --- Processa Ponto Fraco ---
            if (weakestTopicResult.error) throw weakestTopicResult.error;
            if (weakestTopicResult.data && weakestTopicResult.data.topic) {
                setFocusTopic(weakestTopicResult.data.topic); 
            } else {
                setFocusTopic("Nenhum (mín. 3 questões)"); 
            }

            // --- Processa Stats por Tópico ---
            if (topicStatsResult.error) throw topicStatsResult.error;
            setTopicStats(topicStatsResult.data || []); 

        } catch (error) {
            console.error("Erro ao carregar dados de progresso:", error.message);
            setFocusTopic("Erro ao calcular"); 
            setStatsData([
                { id: '1', icon: ListChecks, value: '0', label: 'M.E. Feitas' },
                { id: '4', icon: Target, value: '0%', label: 'Taxa de Acerto' },
            ]);
            setTopicStats([]);
        } finally {
            setLoading(false);
        }
    }, [user, filtroProva]);
    
    // Roda a função
    useEffect(() => {
        loadProgressData();
    }, [loadProgressData]);
    // ---------------

    // --- FUNÇÃO DE NAVEGAÇÃO ---
    const handleHistoryClick = (item) => {
        if (item.type === 'M.E.' || item.type === 'Case') {
            navigation.navigate('ReviewSimuladoPage', {
                sessionId: item.id,
                sessionTitle: item.title,
            });
        } else if (item.type === 'Interativa') {
            navigation.navigate('InteractiveResultPage', {
                sessionId: item.id,
            });
        } else {
            alert('Modo de revisão para Simulado Completo em construção!');
        }
    };

    // --- RENDER HISTORY ---
    const renderHistoryContent = () => {
        if (loading) {
            return null;
        }
        if (historyList.length === 0) {
            return <Text style={styles.emptyHistoryText}>Nenhum simulado concluído ainda.</Text>;
        }
        return (
            <FlatList
                data={historyList} 
                renderItem={({ item }) => (
                    <HistoryItem 
                        item={item} 
                        onPress={handleHistoryClick}
                    />
                )}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
        );
    };

    // --- FUNÇÃO DO MODAL ---
    const handleSelectProva = (prova) => {
        setFiltroProva(prova);
        setModalVisible(false);
    };

    // --- RENDERIZAÇÃO PRINCIPAL ---
    return (
        <SafeAreaView style={styles.safeArea}>
            
            {/* --- HEADER --- */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Seu Progresso</Text>
                <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Text style={styles.dropdownButtonText}>
                        {filtroProva.toUpperCase()}
                    </Text>
                    <ChevronDown size={18} color={cores.textPrimary} />
                </TouchableOpacity>
            </View>
            {/* --- Fim do Header --- */}


            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24, gap: 24 }}
            >
                {/* --- 1. SEÇÃO TOPO: RESUMO --- */}
                <View>
                    <Text style={styles.sectionTitle}>Resumo Geral</Text>
                    
                    {/* O FlatList agora renderiza 2 ou 4 cards,
                       graças à lógica de filtro em loadProgressData */}
                    <FlatList
                        data={statsData} 
                        renderItem={({ item }) => (
                            <StatCard icon={item.icon} value={item.value} label={item.label} />
                        )}
                        keyExtractor={item => item.id}
                        numColumns={2} 
                        scrollEnabled={false} 
                        style={styles.statsGrid}
                    />
                    
                    <FocusCard 
                        icon={Brain} 
                        value={loading ? "Calculando..." : focusTopic} 
                        label="Ponto a Melhorar" 
                    />
                </View>
                
                {/* ======================================================= */}
                {/* ☆ INÍCIO DA MUDANÇA (Esconder se "Todos") ☆ */}
                {/* ======================================================= */}
                {/* Só mostra esta seção se o filtro NÃO for 'Todos' */}
                {filtroProva !== 'Todos' && (
                  <View>
                      <Text style={styles.sectionTitle}>Desempenho por Tópico (M.E.)</Text>
                      
                      {loading && <ActivityIndicator color={cores.primary} style={{ margin: 20 }} />}
                      
                      {!loading && topicStats.length === 0 && (
                          <View style={styles.card}>
                              <Text style={styles.emptyHistoryText}>
                                  Responda questões de M.E. para ver suas estatísticas por tópico.
                              </Text>
                          </View>
                      )}

                      {!loading && topicStats.length > 0 && (
                          <FlatList
                              data={topicStats}
                              renderItem={({ item }) => <TopicStatItem item={item} />}
                              keyExtractor={item => item.topic}
                              scrollEnabled={false}
                              ListHeaderComponent={<View style={{height: 1}} />}
                              ListFooterComponent={<View style={{height: 1}} />}
                              style={styles.topicStatsCard}
                          />
                      )}
                  </View>
                )}
                {/* ======================================================= */}
                {/* ☆ FIM DA MUDANÇA ☆ */}
                {/* ======================================================= */}

                
                {/* --- 2. SEÇÃO BAIXO: HISTÓRICO --- */}
                <View>
                    <Text style={styles.sectionTitle}>Histórico de Simulados</Text>
                    <View style={styles.card}>
                        {renderHistoryContent()} 
                    </View>
                </View>
            </ScrollView>

            {/* --- MODAL (Dropdown) --- */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                {PROVAS.map((prova) => (
                                    <TouchableOpacity
                                        key={prova}
                                        style={styles.modalOption}
                                        onPress={() => handleSelectProva(prova)}
                                    >
                                        <Text style={[
                                            styles.modalOptionText,
                                            filtroProva === prova && styles.modalOptionTextActive
                                        ]}>
                                            {prova.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

        </SafeAreaView>
    );
}

// --- ESTILOS COMPLETOS ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: cores.background,
        paddingTop: Platform.OS === 'android' ? 25 : 0,
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 30 : 16,
        paddingBottom: 10, 
        paddingHorizontal: 20,
        backgroundColor: cores.background,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: cores.textPrimary,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: cores.cardBackground,
        borderWidth: 1,
        borderColor: cores.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minWidth: 110,
        justifyContent: 'space-between',
        shadowColor: cores.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 5,
        elevation: 3,
    },
    dropdownButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: cores.textPrimary,
        marginRight: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: cores.cardBackground,
        borderRadius: 20,
        padding: 10,
        width: '80%',
        maxWidth: 300,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 10,
    },
    modalOption: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    modalOptionText: {
        fontSize: 16,
        fontWeight: '600',
        color: cores.textSecondary,
        textAlign: 'center',
    },
    modalOptionTextActive: {
        color: cores.primary,
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: cores.textPrimary,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    card: {
        backgroundColor: cores.cardBackground,
        borderRadius: 20,
        shadowColor: cores.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 5,
        overflow: 'hidden', 
    },
    statsGrid: {
        marginHorizontal: -8, 
    },
    statCard: {
        flex: 1, 
        backgroundColor: cores.cardBackground,
        borderRadius: 20,
        padding: 16,
        alignItems: 'flex-start',
        margin: 8, 
        shadowColor: cores.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: cores.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: cores.textPrimary,
    },
    statLabel: {
        fontSize: 13,
        color: cores.textSecondary,
        marginTop: 2,
    },
    focusCard: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 20, 
    },
    focusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: cores.orangeLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    focusValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: cores.textPrimary,
        marginTop: 2,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 16,
    },
    historyIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyTextContainer: {
        flex: 1, 
    },
    historyTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: cores.textPrimary,
        marginBottom: 2,
    },
    historyDate: {
        fontSize: 13,
        color: cores.textSecondary,
    },
    historyResultContainer: {
        marginLeft: 'auto', 
        paddingLeft: 8,
    },
    historyResultText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    greenText: {
        color: cores.greenText,
    },
    redText: {
        color: cores.redText,
    },
    divider: {
        height: 1,
        backgroundColor: cores.border,
        marginHorizontal: 20, 
    },
    emptyHistoryText: {
        padding: 20,
        textAlign: 'center',
        color: cores.textSecondary,
        fontStyle: 'italic',
    },
    topicStatsCard: {
      backgroundColor: cores.cardBackground,
      borderRadius: 20,
      shadowColor: cores.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 15,
      elevation: 5,
      overflow: 'hidden', 
    },
    topicStatItem: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: cores.border,
    },
    topicStatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    topicStatName: {
      fontSize: 15,
      fontWeight: '600',
      color: cores.textPrimary,
      flex: 1,
      marginRight: 10,
    },
    topicStatAccuracy: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    progressBarBg: {
      height: 8,
      backgroundColor: cores.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFg: {
      height: 8,
      borderRadius: 4,
    },
    topicStatNumbers: {
      fontSize: 12,
      color: cores.textSecondary,
      marginTop: 6,
    }
});