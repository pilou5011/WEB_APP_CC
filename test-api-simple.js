// Script de test simple pour l'API check-email
// Utilisez ce script dans la console du navigateur

async function testCheckEmailAPI(email = 'test@example.com') {
  console.log('🧪 Test de l\'API check-email...');
  console.log('Email testé:', email);
  
  try {
    const response = await fetch('/api/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email })
    });
    
    const data = await response.json();
    
    console.log('📡 Statut de la réponse:', response.status);
    console.log('📦 Données reçues:', data);
    
    if (response.ok) {
      if (data.exists) {
        console.log('✅ API fonctionne ! L\'email existe déjà dans la base.');
      } else {
        console.log('✅ API fonctionne ! L\'email n\'existe pas encore.');
      }
    } else {
      console.error('❌ Erreur API:', data.error);
      if (data.details) {
        console.error('Détails:', data.details);
      }
      if (data.debug) {
        console.error('Info de débogage:', data.debug);
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erreur réseau:', error);
    return null;
  }
}

// Exécuter le test
testCheckEmailAPI('test@example.com');

