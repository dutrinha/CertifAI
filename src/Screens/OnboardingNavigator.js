// src/navigation/OnboardingNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- NOVO: IMPORTAR AS TELAS QUE VAMOS CRIAR NOS PRÓXIMOS PASSOS ---
import WelcomeScreen from '../Screens/WelcomeScreen';
import OnboardingFlowScreen from '../Screens/OnboardingFlowScreen';

const OnboardingStack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      
      {/* Etapa 0: Pedir o nome. 
        Esta é a primeira tela que o novo usuário verá.
      */}
      <OnboardingStack.Screen 
        name="Welcome" 
        component={WelcomeScreen} 
      />
      
      {/* Etapa 1-5: O fluxo de apresentação (Fatos, Problema, Solução, Hábito).
        Será chamado pela tela 'Welcome' após o usuário salvar o nome.
      */}
      <OnboardingStack.Screen 
        name="OnboardingFlow" 
        component={OnboardingFlowScreen} 
      />
      
    </OnboardingStack.Navigator>
  );
}