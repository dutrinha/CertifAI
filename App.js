// /App.jsx (Versão FINAL - Corrigido erro de estrutura do Navigator)
import React from 'react';
import { ActivityIndicator, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { Home, FileText, BarChart3, MessageSquare } from 'lucide-react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider, useAuth } from './src/context/AuthContext'; //
import { ContentProvider } from './src/context/ContentContext';

// Import Pages
import HomePage from './src/pages/HomePage'; //
import TrilhasPage from './src/pages/TrilhasPage'; //
import TopicosPage from './src/pages/TopicosPage' //
import ProgressPage from './src/pages/ProgressPage';
import SimuladoPage from './src/pages/SimuladoPage'; //
import ResultadoPage from './src/pages/ResultadoPage'; //
import CertificationHubPage from './src/pages/CertificationHubPage'; //
import StudyCasePage from './src/pages/StudyCasePage'; //
import InteractiveQuestionPage from './src/pages/InteractiveQuestionPage'; //
import InteractiveResultPage from './src/pages/InteractiveResultPage'; //
import SimuladoCompletoConfigPage from './src/pages/SimuladoCompletoConfigPage';
import SimuladoCompletoResultadoPage from './src/pages/SimuladoCompletoResultadoPage';
import SimuladoCompletoRunnerPage from './src/pages/SimuladoCompletoRunnerPage';
import SimuladoCompletoHandlerPage from './src/pages/SimuladoCompletoHandlerPage';
import ReviewSimuladoPage from './src/pages/ReviewSimuladoPage';
import FlashCardPage from './src/pages/FlashCardPage';
import ChatPage from './src/pages/ChatPage';

// Import Screens
import LoginScreen from './src/Screens/LoginScreen'; //
import SettingsScreen from './src/Screens/SettingsScreen'; //
import OnboardingNavigator from './src/Screens/OnboardingNavigator'; //

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const TrilhasStack = createNativeStackNavigator();

// Cores
const lightColors = {
  primary: '#00C853', secondary: '#1A202C', background: '#FFFFFF',
  card: '#FFFFFF', text: '#1A202C', textSecondary: '#64748B', border: '#E2E8F0',
};

// --- Navegadores ---
function TrilhasNavigator() {
  return (
    <TrilhasStack.Navigator screenOptions={{ headerShown: false }}>
      {/* A página raiz da aba */}
      <TrilhasStack.Screen name="TrilhasRoot" component={TrilhasPage} />
      
      {/* As páginas "filhas" (Hubs) que a TrilhasPage pode chamar */}
      {/* Os nomes ("cpa-hub", "cpa10-hub") SÃO OS MESMOS que a TrilhasPage.js usa no navigation.navigate() */}
      <TrilhasStack.Screen 
        name="cpa-hub" 
        component={CertificationHubPage} 
        initialParams={{ certificationType: 'cpa', certificationName: 'CPA' }} 
      />
      <TrilhasStack.Screen 
        name="cpror-hub" 
        component={CertificationHubPage} 
        initialParams={{ certificationType: 'cpror', certificationName: 'C-PRO R' }} 
      />
      <TrilhasStack.Screen 
        name="cproi-hub" 
        component={CertificationHubPage} 
        initialParams={{ certificationType: 'cproi', certificationName: 'C-PRO I' }} 
      />
      <TrilhasStack.Screen 
        name="cpa10-hub" 
        component={CertificationHubPage} 
        initialParams={{ certificationType: 'cpa10', certificationName: 'CPA-10' }} 
      />
      <TrilhasStack.Screen 
        name="cpa20-hub" 
        component={CertificationHubPage} 
        initialParams={{ certificationType: 'cpa20', certificationName: 'CPA-20' }} 
      />
      <TrilhasStack.Screen 
        name="cea-hub" 
        component={CertificationHubPage} 
        initialParams={{ certificationType: 'cea', certificationName: 'CEA' }} 
      />
    </TrilhasStack.Navigator>
  );
}


function TabNavigator() {
  const colors = lightColors;
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)', borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 4, height: 80,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Início') return <Home size={size} color={color} />;
          if (route.name === 'Trilhas') return <FileText size={size} color={color} />;
          if (route.name === 'Progresso') return <BarChart3 size={size} color={color} />;
          if (route.name === 'Chat') return <MessageSquare size={size} color={color} />;
          return null;
        },
      })}>
      <Tab.Screen name="Início" component={HomePage} />
      <Tab.Screen name="Trilhas" component={TrilhasNavigator} />
      <Tab.Screen name="Chat" component={ChatPage} />
      <Tab.Screen name="Progresso" component={ProgressPage} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// =======================================================
// ☆ ROOT NAVIGATOR CORRIGIDO ☆
// =======================================================
function RootNavigator() {
  const { session, user, loading: authLoading } = useAuth(); //
  const colors = lightColors;

  if (authLoading) {
    return ( <View style={[ styles.loadingContainer, { backgroundColor: colors.background } ]}><ActivityIndicator size="large" color={colors.primary} /></View> );
  }

  const hasCompletedOnboarding = user?.user_metadata?.onboarding_completed === true; //

  return (
    // Removido qualquer espaço/comentário diretamente aqui
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session && session.user ? (
        // Usuário Logado - Usamos um Fragment <> para agrupar as telas
        <>
          {/* --- DECISÃO: ONBOARDING OU APP PRINCIPAL --- */}
          {hasCompletedOnboarding ? (
             <Stack.Screen name="Tabs" component={TabNavigator} />
          ) : (
             <Stack.Screen name="Onboarding" component={OnboardingNavigator} /> //
          )}
          {/* --- Fim da decisão --- */}

          {/* --- Telas sempre disponíveis quando logado --- */}
          {/* Certifique-se de que não há espaços/comentários entre estas telas */}
          <Stack.Screen name="cpa10-hub" component={CertificationHubPage} initialParams={{ certificationType: 'cpa10', certificationName: 'CPA-10' }} />
          <Stack.Screen name="cpa20-hub" component={CertificationHubPage} initialParams={{ certificationType: 'cpa20', certificationName: 'CPA-20' }} />
          <Stack.Screen name="cea-hub" component={CertificationHubPage} initialParams={{ certificationType: 'cea', certificationName: 'CEA' }} />
          <Stack.Screen name="cpa-hub" component={CertificationHubPage} initialParams={{ certificationType: 'cpa', certificationName: 'CPA' }} />
          <Stack.Screen name="cpror-hub" component={CertificationHubPage} initialParams={{ certificationType: 'cpror', certificationName: 'C-PRO R' }} />
          <Stack.Screen name="cproi-hub" component={CertificationHubPage} initialParams={{ certificationType: 'cproi', certificationName: 'C-PRO I' }} />

          <Stack.Screen name="topicos" component={TopicosPage} />
          
          <Stack.Screen name="simulado" component={SimuladoPage} />
          <Stack.Screen name="StudyCasePage" component={StudyCasePage} />
          <Stack.Screen name="InteractiveQuestionPage" component={InteractiveQuestionPage} />
          <Stack.Screen name="InteractiveResultPage" component={InteractiveResultPage} />
          <Stack.Screen name="resultado" component={ResultadoPage} />
          <Stack.Screen name="simulado-completo-config" component={SimuladoCompletoConfigPage} />
          <Stack.Screen name="simulado-completo-resultado" component={SimuladoCompletoResultadoPage} />
          <Stack.Screen name="simulado-completo-runner" component={SimuladoCompletoRunnerPage} />
          <Stack.Screen name="simulado-completo-handler" component={SimuladoCompletoHandlerPage} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ReviewSimuladoPage" component={ReviewSimuladoPage} />
          <Stack.Screen name="FlashCardPage" component={FlashCardPage} />
          
          {/* --- Fim das telas --- */}
        </> // Fim do Fragment para usuário logado
      ) : (
        // Usuário Deslogado
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
      {/* Removido qualquer espaço/comentário diretamente aqui */}
    </Stack.Navigator>
  );
}


// Componente App principal
export default function App() {
  console.log('App: Rendering AuthProvider');
  return (
    <AuthProvider>
      <PaperProvider theme={MD3LightTheme}>
        <NavigationContainer theme={DefaultTheme}>
          <StatusBar barStyle="dark-content" backgroundColor={lightColors.background} />
          <ContentProvider>
            <RootNavigator />
          </ContentProvider>
        </NavigationContainer>
      </PaperProvider>
    </AuthProvider>
  );
}

// Estilos
const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});