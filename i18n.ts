export type AppLanguage = 'en' | 'hi' | 'mr' | 'te' | 'fr' | 'es' | 'de';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
];

export type TranslationKey =
  | 'appTitle'
  | 'yourSmartFarmingAssistant'
  | 'welcomeMessage'
  | 'openSettings'
  | 'provider'
  | 'units'
  | 'temp'
  | 'logout'
  | 'checkingWeatherAlerts'
  | 'noApiConfigured'
  | 'signIn'
  | 'createAccount'
  | 'email'
  | 'password'
  | 'login'
  | 'register'
  | 'registerHere'
  | 'dontHaveAccount'
  | 'haveAccount'
  | 'personalInformation'
  | 'accountCredentials'
  | 'contactInformation'
  | 'firstName'
  | 'lastName'
  | 'confirmPassword'
  | 'phone'
  | 'streetAddress'
  | 'city'
  | 'state'
  | 'country'
  | 'zipCode'
  | 'registrationSuccessful'
  | 'welcomeUser'
  | 'proceedToLogin'
  | 'errorRequiredFields'
  | 'errorPasswordsMismatch'
  | 'errorNameRequired'
  | 'errorUnexpected'
  | 'tabCapacity'
  | 'tabWeather'
  | 'tabWatering'
  | 'tabFertilization'
  | 'tabEncyclopedia';

const en: Record<TranslationKey, string> = {
  appTitle: 'AI Farming Cultivation Estimator',
  yourSmartFarmingAssistant: 'Your smart farming assistant',
  welcomeMessage: 'Please add an API Provider key in the settings to get started.',
  openSettings: 'Open Settings',
  provider: 'Provider:',
  units: 'Units:',
  temp: 'Temp:',
  logout: 'Logout',
  checkingWeatherAlerts: 'Checking for weather alerts...',
  noApiConfigured: 'Not Configured',
  signIn: 'Sign In',
  createAccount: 'Create Account',
  email: 'Email',
  password: 'Password',
  login: 'Login',
  register: 'Register',
  registerHere: 'Register here',
  dontHaveAccount: "Don't have an account?",
  haveAccount: 'Already have an account?',
  personalInformation: 'Personal Information',
  accountCredentials: 'Account Credentials',
  contactInformation: 'Contact Information',
  firstName: 'First Name',
  lastName: 'Last Name',
  confirmPassword: 'Confirm Password',
  phone: 'Phone',
  streetAddress: 'Street Address',
  city: 'City',
  state: 'State',
  country: 'Country',
  zipCode: 'Zip Code',
  registrationSuccessful: 'Registration Successful!',
  welcomeUser: 'Welcome,',
  proceedToLogin: 'Proceed to Login',
  errorRequiredFields: 'Both fields are required.',
  errorPasswordsMismatch: 'Passwords do not match.',
  errorNameRequired: 'First name and last name are required.',
  errorUnexpected: 'An unexpected error occurred. Please try again.',
  tabCapacity: 'Growing Capacity',
  tabWeather: 'Weather Prediction',
  tabWatering: 'Watering Needs',
  tabFertilization: 'Fertilization & Disease Analysis',
  tabEncyclopedia: 'Crop Encyclopedia',
};

const hi: Record<TranslationKey, string> = {
  appTitle: 'एआई फार्मिंग कल्टीवेशन इस्टीमेटर',
  yourSmartFarmingAssistant: 'आपका स्मार्ट फ़ार्मिंग सहायक',
  welcomeMessage: 'शुरू करने के लिए कृपया सेटिंग्स में एक एपीआई प्रोवाइडर कुंजी जोड़ें।',
  openSettings: 'सेटिंग्स खोलें',
  provider: 'प्रदाता:',
  units: 'इकाइयां:',
  temp: 'तापमान:',
  logout: 'लॉग आउट',
  checkingWeatherAlerts: 'मौसम चेतावनियों की जांच की जा रही है...',
  noApiConfigured: 'कॉन्फ़िगर नहीं किया गया',
  signIn: 'साइन इन',
  createAccount: 'खाता बनाएँ',
  email: 'ईमेल',
  password: 'पासवर्ड',
  login: 'लॉगिन',
  register: 'रजिस्टर करें',
  registerHere: 'यहाँ रजिस्टर करें',
  dontHaveAccount: 'क्या आपका कोई खाता नहीं है?',
  haveAccount: 'पहले से एक खाता है?',
  personalInformation: 'व्यक्तिगत जानकारी',
  accountCredentials: 'खाता क्रेडेंशियल',
  contactInformation: 'संपर्क जानकारी',
  firstName: 'पहला नाम',
  lastName: 'अंतिम नाम',
  confirmPassword: 'पासवर्ड की पुष्टि करें',
  phone: 'फ़ोन',
  streetAddress: 'सड़क पता',
  city: 'शहर',
  state: 'राज्य',
  country: 'देश',
  zipCode: 'पिन कोड',
  registrationSuccessful: 'पंजीकरण सफलता!',
  welcomeUser: 'स्वागत है,',
  proceedToLogin: 'लॉगिन करने के लिए आगे बढ़ें',
  errorRequiredFields: 'दोनों फ़ील्ड आवश्यक हैं।',
  errorPasswordsMismatch: 'पासवर्ड मेल नहीं खाते।',
  errorNameRequired: 'पहला नाम और अंतिम नाम आवश्यक हैं।',
  errorUnexpected: 'एक अप्रत्याशित त्रुटि हुई। फिर से प्रयास करें।',
  tabCapacity: 'उगाने की क्षमता',
  tabWeather: 'मौसम पूर्वानुमान',
  tabWatering: 'पानी की आवश्यकताएँ',
  tabFertilization: 'उर्वरक और रोग विश्लेषण',
  tabEncyclopedia: 'फसल एनसाइक्लोपीडिया',
};

const mr: Record<TranslationKey, string> = {
  appTitle: 'एआय शेती वाढीचे अंदाजक',
  yourSmartFarmingAssistant: 'तुमचा स्मार्ट शेती सहाय्यक',
  welcomeMessage: 'सुरू करण्यासाठी कृपया सेटिंग्जमध्ये एपीआय प्रोव्हायडर की जोडा.',
  openSettings: 'सेटिंग्ज उघडा',
  provider: 'प्रदात्या:',
  units: 'एकके:',
  temp: 'तापमान:',
  logout: 'लॉगआऊट',
  checkingWeatherAlerts: 'हवामान इशाऱ्यांची तपासणी केली जात आहे...',
  noApiConfigured: 'सज्ज केलेले नाही',
  signIn: 'साइन इन',
  createAccount: 'अकेाऊंट तयार करा',
  email: 'ईमेल',
  password: 'संकेतशब्द',
  login: 'लॉगिन',
  register: 'नोंदणी करा',
  registerHere: 'इथे नोंदणी करा',
  dontHaveAccount: 'तुमच्याकडे खाते नाही का?',
  haveAccount: 'पूर्वीच खाते आहे?',
  personalInformation: 'वैयक्तिक माहिती',
  accountCredentials: 'खाते प्रमाणपत्र',
  contactInformation: 'संपर्क माहिती',
  firstName: 'पहिले नाव',
  lastName: 'आडनाव',
  confirmPassword: 'संकेतशब्द पुष्टी करा',
  phone: 'फोन',
  streetAddress: 'रस्त्याचा पत्ता',
  city: 'शहर',
  state: 'राज्य',
  country: 'देश',
  zipCode: 'पिन कोड',
  registrationSuccessful: 'नोंदणी यशस्वी झाली!',
  welcomeUser: 'स्वागत आहे,',
  proceedToLogin: 'लॉगिन करण्यासाठी पुढे जा',
  errorRequiredFields: 'दोन्ही फील्ड आवश्यक आहेत.',
  errorPasswordsMismatch: 'संकेतशब्द जुळत नाहीत.',
  errorNameRequired: 'पहिले नाव आणि आडनाव आवश्यक आहे.',
  errorUnexpected: 'अनपेक्षित त्रुटी आली. कृपया पुन्हा प्रयत्न करा.',
  tabCapacity: 'उद्यान क्षमता',
  tabWeather: 'हवामान अंदाज',
  tabWatering: 'पाणी गरजा',
  tabFertilization: 'खते आणि रोग विश्लेषण',
  tabEncyclopedia: 'पिक विश्वकोश',
};

const te: Record<TranslationKey, string> = {
  appTitle: 'ఏఐ వ్యవసాయ మేనేజర్',
  yourSmartFarmingAssistant: 'మీ తెలివైన వ్యవసాయ సహాయకుడు',
  welcomeMessage: 'ఆరంభించడానికి దయచేసి సెట్టింగ్స్లో API ప్రొవైడర్ కీని జోడించండి.',
  openSettings: 'సెట్టింగ్స్ ఓపెన్ చేయండి',
  provider: 'ప్రొవైడర్:',
  units: 'ఐక్యాలు:',
  temp: 'తాపం:',
  logout: 'లాగ్ అవుట్',
  checkingWeatherAlerts: 'వాతావరణ హెచ్చరికల కోసం తనిఖీ చేస్తోంది...',
  noApiConfigured: 'కాన్ఫిగర్ చేయలేదు',
  signIn: 'సైన్ ఇన్',
  createAccount: 'ఖాతాను సృష్టించండి',
  email: 'ఇమెయిల్',
  password: 'పాస్‌వర్డ్',
  login: 'లాగిన్',
  register: 'నమోదు చేయండి',
  registerHere: 'ఇక్కడ నమోదు చేయండి',
  dontHaveAccount: 'మీ దగ్గర ఖాతా లేకపోతే?',
  haveAccount: 'ఇప్పటికే ఖాతా ఉంది?',
  personalInformation: 'వ్యక్తిగత సమాచారం',
  accountCredentials: 'ఖాతా సర్టిఫికేషన్',
  contactInformation: 'సంప్రదింపు సమాచారం',
  firstName: 'మొదటి పేరు',
  lastName: 'చివరి పేరు',
  confirmPassword: 'పాస్‌వర్డ్‌ను ధృవీకరించండి',
  phone: 'ఫోన్',
  streetAddress: 'వీధి చిరునామా',
  city: 'నగరం',
  state: 'రాష్ట్రం',
  country: 'దేశం',
  zipCode: 'జిప్ కోడ్',
  registrationSuccessful: 'నమోదు విజయవంతంగా అయింది!',
  welcomeUser: 'స్వాగతం,',
  proceedToLogin: 'లాగిన్ చేయడానికి కొనసాగండి',
  errorRequiredFields: 'రెండు ఫీల్డ్‌లు అవసరం.',
  errorPasswordsMismatch: 'పాస్‌వర్డ్‌లు సరిపోలడం లేదు.',
  errorNameRequired: 'మొదటి పేరు మరియు చివరి పేరు అవసరం.',
  errorUnexpected: 'ఒక అనూహ్య విఫలత సంభవించింది. దయచేసి మరోసారి ప్రయత్నించండి.',
  tabCapacity: 'వృద్ధి సామర్థ్యం',
  tabWeather: 'వాతావరణ అంచనాలు',
  tabWatering: 'నీటి అవసరాలు',
  tabFertilization: 'పైరాసు & రోగ విశ్లేషణ',
  tabEncyclopedia: 'పంట విశ్వకోశం',
};

const fr: Record<TranslationKey, string> = {
  appTitle: 'Estimateur de culture agricole IA',
  yourSmartFarmingAssistant: 'Votre assistant agricole intelligent',
  welcomeMessage: 'Veuillez ajouter une clé de fournisseur d\'API dans les paramètres pour commencer.',
  openSettings: 'Ouvrir les paramètres',
  provider: 'Fournisseur :',
  units: 'Unités :',
  temp: 'Temp :',
  logout: 'Déconnexion',
  checkingWeatherAlerts: 'Recherche d\'alertes météo...',
  noApiConfigured: 'Non configuré',
  signIn: 'Se connecter',
  createAccount: 'Créer un compte',
  email: 'Email',
  password: 'Mot de passe',
  login: 'Connexion',
  register: 'S\'inscrire',
  registerHere: 'Inscrivez-vous ici',
  dontHaveAccount: 'Vous n\'avez pas de compte ?',
  haveAccount: 'Vous avez déjà un compte ?',
  personalInformation: 'Informations personnelles',
  accountCredentials: 'Identifiants du compte',
  contactInformation: 'Informations de contact',
  firstName: 'Prénom',
  lastName: 'Nom',
  confirmPassword: 'Confirmez le mot de passe',
  phone: 'Téléphone',
  streetAddress: 'Adresse',
  city: 'Ville',
  state: 'État',
  country: 'Pays',
  zipCode: 'Code postal',
  registrationSuccessful: 'Inscription réussie !',
  welcomeUser: 'Bienvenue,',
  proceedToLogin: 'Passer à la connexion',
  errorRequiredFields: 'Tous les champs sont obligatoires.',
  errorPasswordsMismatch: 'Les mots de passe ne correspondent pas.',
  errorNameRequired: 'Le prénom et le nom sont requis.',
  errorUnexpected: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
  tabCapacity: 'Capacité de croissance',
  tabWeather: 'Prévisions météo',
  tabWatering: 'Besoins en eau',
  tabFertilization: 'Fertilisation et analyse des maladies',
  tabEncyclopedia: 'Encyclopédie des cultures',
};

const es: Record<TranslationKey, string> = {
  appTitle: 'Estimador de cultivo agrícola con IA',
  yourSmartFarmingAssistant: 'Tu asistente agrícola inteligente',
  welcomeMessage: 'Agrega una clave de proveedor de API en la configuración para comenzar.',
  openSettings: 'Abrir configuración',
  provider: 'Proveedor:',
  units: 'Unidades:',
  temp: 'Temp:',
  logout: 'Cerrar sesión',
  checkingWeatherAlerts: 'Buscando alertas meteorológicas...',
  noApiConfigured: 'No configurado',
  signIn: 'Iniciar sesión',
  createAccount: 'Crear cuenta',
  email: 'Correo electrónico',
  password: 'Contraseña',
  login: 'Iniciar sesión',
  register: 'Registrarse',
  registerHere: 'Regístrate aquí',
  dontHaveAccount: '¿No tienes una cuenta?',
  haveAccount: '¿Ya tienes una cuenta?',
  personalInformation: 'Información personal',
  accountCredentials: 'Credenciales de la cuenta',
  contactInformation: 'Información de contacto',
  firstName: 'Nombre',
  lastName: 'Apellido',
  confirmPassword: 'Confirmar contraseña',
  phone: 'Teléfono',
  streetAddress: 'Dirección',
  city: 'Ciudad',
  state: 'Estado',
  country: 'País',
  zipCode: 'Código postal',
  registrationSuccessful: '¡Registro exitoso!',
  welcomeUser: 'Bienvenido,',
  proceedToLogin: 'Proceder a iniciar sesión',
  errorRequiredFields: 'Ambos campos son obligatorios.',
  errorPasswordsMismatch: 'Las contraseñas no coinciden.',
  errorNameRequired: 'Se requieren nombre y apellido.',
  errorUnexpected: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
  tabCapacity: 'Capacidad de cultivo',
  tabWeather: 'Predicción del clima',
  tabWatering: 'Necesidades de riego',
  tabFertilization: 'Fertilización y análisis de enfermedades',
  tabEncyclopedia: 'Enciclopedia de cultivos',
};

const de: Record<TranslationKey, string> = {
  appTitle: 'KI-Bauernhofkultivierungsrechner',
  yourSmartFarmingAssistant: 'Ihr intelligenter Landwirtschaftsassistent',
  welcomeMessage: 'Bitte fügen Sie zum Starten einen API-Anbieterschlüssel in den Einstellungen hinzu.',
  openSettings: 'Einstellungen öffnen',
  provider: 'Anbieter:',
  units: 'Einheiten:',
  temp: 'Temp:',
  logout: 'Abmelden',
  checkingWeatherAlerts: 'Suche nach Wetterwarnungen...',
  noApiConfigured: 'Nicht konfiguriert',
  signIn: 'Anmelden',
  createAccount: 'Konto erstellen',
  email: 'E-Mail',
  password: 'Passwort',
  login: 'Anmelden',
  register: 'Registrieren',
  registerHere: 'Hier registrieren',
  dontHaveAccount: 'Sie haben noch kein Konto?',
  haveAccount: 'Sie haben bereits ein Konto?',
  personalInformation: 'Persönliche Informationen',
  accountCredentials: 'Kontozugangsdaten',
  contactInformation: 'Kontaktinformationen',
  firstName: 'Vorname',
  lastName: 'Nachname',
  confirmPassword: 'Passwort bestätigen',
  phone: 'Telefon',
  streetAddress: 'Straßenadresse',
  city: 'Stadt',
  state: 'Bundesland',
  country: 'Land',
  zipCode: 'Postleitzahl',
  registrationSuccessful: 'Registrierung erfolgreich!',
  welcomeUser: 'Willkommen,',
  proceedToLogin: 'Weiter zur Anmeldung',
  errorRequiredFields: 'Beide Felder sind erforderlich.',
  errorPasswordsMismatch: 'Passwörter stimmen nicht überein.',
  errorNameRequired: 'Vor- und Nachname sind erforderlich.',
  errorUnexpected: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
  tabCapacity: 'Wachstumskapazität',
  tabWeather: 'Wettervorhersage',
  tabWatering: 'Bewässerungsbedarf',
  tabFertilization: 'Düngung & Krankheitsanalyse',
  tabEncyclopedia: 'Pflanzen-Enzyklopädie',
};

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en,
  hi,
  mr,
  te,
  fr,
  es,
  de,
};

export const translate = (language: AppLanguage, key: TranslationKey): string => {
  const languagePack = translations[language] || translations.en;
  return languagePack[key] ?? translations.en[key] ?? key;
};