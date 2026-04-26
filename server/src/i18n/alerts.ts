export type Lang = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'mr';
export type AlertKind = 'heat_wave' | 'heavy_rain' | 'high_wind' | 'cold_snap';

type AlertStrings = {
  title: string;
  description: (v: { value: number; dateLabel: string }) => string;
  action: string;
};

type LangPack = Record<AlertKind, AlertStrings>;

const en: LangPack = {
  heat_wave: {
    title: 'Heat wave expected',
    description: ({ value, dateLabel }) =>
      `Daytime highs around ${value}°C on ${dateLabel}. Heat-sensitive crops may flower-abort.`,
    action: 'Mulch the root zone, water before 8 AM, and delay fertiliser application until the heatwave passes.',
  },
  heavy_rain: {
    title: 'Heavy rain likely',
    description: ({ value, dateLabel }) =>
      `Forecast rainfall around ${value} mm on ${dateLabel}. Waterlogging is a risk for rabi crops and newly sown fields.`,
    action: 'Clear drainage channels today. Postpone pesticide application until 24h after the rain passes.',
  },
  high_wind: {
    title: 'High wind expected',
    description: ({ value, dateLabel }) =>
      `Winds up to ${value} m/s on ${dateLabel}. Risk of lodging in cereals and fruit drop in orchards.`,
    action: 'Stake tall plants, harvest ripe fruit early, and avoid spraying — drift will waste your inputs.',
  },
  cold_snap: {
    title: 'Cold snap ahead',
    description: ({ value, dateLabel }) =>
      `Overnight lows near ${value}°C on ${dateLabel}. Frost damage risk for flowering crops.`,
    action: 'Irrigate in the evening (wet soil retains heat), cover seedlings, and watch for frost injury.',
  },
};

const hi: LangPack = {
  heat_wave: {
    title: 'हीटवेव की आशंका',
    description: ({ value, dateLabel }) =>
      `${dateLabel} को दोपहर का तापमान ~${value}°C। गर्मी के प्रति संवेदनशील फसलों में फूल झड़ सकते हैं।`,
    action: 'जड़ क्षेत्र में मल्चिंग करें, सुबह 8 बजे से पहले सिंचाई करें, उर्वरक देना टालें।',
  },
  heavy_rain: {
    title: 'भारी बारिश की संभावना',
    description: ({ value, dateLabel }) =>
      `${dateLabel} को ~${value} मिमी बारिश। नई बुवाई और रबी फसलों में जलभराव का खतरा।`,
    action: 'आज ही नालियाँ साफ़ करें। बारिश के 24 घंटे बाद तक कीटनाशक न डालें।',
  },
  high_wind: {
    title: 'तेज़ हवा की चेतावनी',
    description: ({ value, dateLabel }) =>
      `${dateLabel} को ~${value} मी/से तक हवा। अनाज में लोधजन और बाग़ों में फलगिरन का जोखिम।`,
    action: 'लंबे पौधों को सहारा दें, पके फल जल्दी तोड़ें, छिड़काव से बचें।',
  },
  cold_snap: {
    title: 'शीतलहर आ रही है',
    description: ({ value, dateLabel }) =>
      `${dateLabel} की रात ~${value}°C तक। फूल आई फसलों में पाले का खतरा।`,
    action: 'शाम को सिंचाई करें (गीली मिट्टी गर्मी पकड़ती है), पौधों को ढकें।',
  },
};

const kn: LangPack = {
  heat_wave: {
    title: 'ತೀವ್ರ ಬಿಸಿಲಿನ ಎಚ್ಚರಿಕೆ',
    description: ({ value, dateLabel }) =>
      `${dateLabel} ರಂದು ಗರಿಷ್ಠ ~${value}°C. ಬಿಸಿಲಿಗೆ ಸೂಕ್ಷ್ಮ ಬೆಳೆಗಳು ಹೂ ಉದುರಬಹುದು.`,
    action: 'ಬೇರುಗೆ ಮಲ್ಚ್ ಹಾಕಿ, ಬೆಳಿಗ್ಗೆ 8 ಗಂಟೆಯ ಮೊದಲು ನೀರು ಹಾಯಿಸಿ, ಗೊಬ್ಬರ ಮುಂದೂಡಿ.',
  },
  heavy_rain: {
    title: 'ಭಾರಿ ಮಳೆಯ ಸಾಧ್ಯತೆ',
    description: ({ value, dateLabel }) =>
      `${dateLabel} ರಂದು ~${value} ಮಿಮೀ ಮಳೆ. ನೀರು ನಿಲ್ಲುವ ಅಪಾಯ.`,
    action: 'ಇಂದು ಚರಂಡಿ ಸ್ವಚ್ಛಗೊಳಿಸಿ. 24 ಗಂಟೆಯವರೆಗೆ ಕೀಟನಾಶಕ ಹಾಕಬೇಡಿ.',
  },
  high_wind: {
    title: 'ಬಲವಾದ ಗಾಳಿ ಎಚ್ಚರಿಕೆ',
    description: ({ value, dateLabel }) =>
      `${dateLabel} ರಂದು ~${value} ಮೀ/ಸೆ ಗಾಳಿ. ಧಾನ್ಯ ಬೆಳೆಗಳು ಬೀಳುವ ಅಪಾಯ.`,
    action: 'ಎತ್ತರದ ಸಸ್ಯಗಳಿಗೆ ಆಧಾರ ಕೊಡಿ, ಹಣ್ಣು ಬೇಗ ಕೊಯ್ಯಿರಿ.',
  },
  cold_snap: {
    title: 'ಶೀತ ಅಲೆ',
    description: ({ value, dateLabel }) =>
      `${dateLabel} ರಾತ್ರಿ ~${value}°C. ಹೂಬಿಡುವ ಬೆಳೆಗಳಿಗೆ ಹಿಮ ಅಪಾಯ.`,
    action: 'ಸಂಜೆ ನೀರಾವರಿ ಮಾಡಿ, ಸಸಿಗಳನ್ನು ಮುಚ್ಚಿ.',
  },
};

const ta: LangPack = {
  heat_wave: {
    title: 'வெப்ப அலை எச்சரிக்கை',
    description: ({ value, dateLabel }) =>
      `${dateLabel} அன்று அதிகபட்சம் ~${value}°C. வெப்பத்திற்கு உணர்திறன் கொண்ட பயிர்களில் பூ உதிரும்.`,
    action: 'வேர் பகுதியில் மல்ச் போடவும், காலை 8 மணிக்கு முன் நீர்ப்பாசனம் செய்யவும்.',
  },
  heavy_rain: {
    title: 'கடுமழை சாத்தியம்',
    description: ({ value, dateLabel }) =>
      `${dateLabel} அன்று ~${value} மிமீ மழை. நீர் தேக்கம் ஆபத்து.`,
    action: 'இன்றே வடிகால் சுத்தம் செய்யவும். 24 மணி நேரத்திற்கு பூச்சிக்கொல்லி போட வேண்டாம்.',
  },
  high_wind: {
    title: 'பலத்த காற்று',
    description: ({ value, dateLabel }) =>
      `${dateLabel} அன்று ~${value} மீ/வி காற்று. தானிய பயிர்கள் சாய ஆபத்து.`,
    action: 'உயரமான செடிகளுக்கு ஆதரவு கொடுக்கவும், பழங்களை விரைவாக அறுவடை செய்யவும்.',
  },
  cold_snap: {
    title: 'குளிர் அலை',
    description: ({ value, dateLabel }) =>
      `${dateLabel} இரவில் ~${value}°C. பூக்கும் பயிர்களுக்கு பனி ஆபத்து.`,
    action: 'மாலை பாசனம் செய்யவும், தைகளை மூடவும்.',
  },
};

const te: LangPack = {
  heat_wave: {
    title: 'వేడిమి తీవ్రత హెచ్చరిక',
    description: ({ value, dateLabel }) =>
      `${dateLabel} రోజు గరిష్ఠం ~${value}°C. వేడిమికి సున్నితమైన పంటల్లో పూత రాలవచ్చు.`,
    action: 'వేరుభాగానికి మల్చ్ వేయండి, ఉదయం 8 గంటల లోపు నీరు పెట్టండి.',
  },
  heavy_rain: {
    title: 'భారీ వర్షం అవకాశం',
    description: ({ value, dateLabel }) =>
      `${dateLabel} రోజు ~${value} మిమీ వర్షం. నీటి నిలయ ప్రమాదం.`,
    action: 'నేడే కాలువలు శుభ్రం చేయండి. 24 గంటల వరకు పురుగుమందు వేయవద్దు.',
  },
  high_wind: {
    title: 'బలమైన గాలి',
    description: ({ value, dateLabel }) =>
      `${dateLabel} రోజు ~${value} మీ/సె గాలి. ధాన్య పంటలు పడిపోయే ప్రమాదం.`,
    action: 'ఎత్తు మొక్కలకు మద్దతు ఇవ్వండి, పండ్లను తొందరగా కోయండి.',
  },
  cold_snap: {
    title: 'చలి తీవ్రత',
    description: ({ value, dateLabel }) =>
      `${dateLabel} రాత్రి ~${value}°C. పుష్పించే పంటలకు మంచు ప్రమాదం.`,
    action: 'సాయంత్రం నీటిపారుదల చేయండి, మొక్కలను కప్పండి.',
  },
};

const mr: LangPack = {
  heat_wave: {
    title: 'उष्णतेची लाट',
    description: ({ value, dateLabel }) =>
      `${dateLabel} ला कमाल ~${value}°C. उष्णतेस संवेदनशील पिकांत फुलगळ शक्य.`,
    action: 'मुळाभोवती आच्छादन करा, सकाळी 8 आधी पाणी द्या, खत देणे पुढे ढकला.',
  },
  heavy_rain: {
    title: 'जोरदार पावसाची शक्यता',
    description: ({ value, dateLabel }) =>
      `${dateLabel} ला ~${value} मिमी पाऊस. पाणी साचण्याचा धोका.`,
    action: 'आजच नाले साफ करा. 24 तास कीटकनाशक फवारू नका.',
  },
  high_wind: {
    title: 'जोरदार वारा',
    description: ({ value, dateLabel }) =>
      `${dateLabel} ला ~${value} मी/से वारा. धान्य पिके लवण्याचा धोका.`,
    action: 'उंच झाडांना आधार द्या, फळे लवकर काढा.',
  },
  cold_snap: {
    title: 'थंडीची लाट',
    description: ({ value, dateLabel }) =>
      `${dateLabel} च्या रात्री ~${value}°C. फुललेल्या पिकांना हिमाचा धोका.`,
    action: 'संध्याकाळी पाणी द्या, रोपांना झाका.',
  },
};

const packs: Record<Lang, LangPack> = { en, hi, kn, ta, te, mr };

export function getAlertStrings(lang: string, kind: AlertKind, v: { value: number; dateLabel: string }) {
  const pack = packs[(lang as Lang) in packs ? (lang as Lang) : 'en'] ?? en;
  const strings = pack[kind];
  return {
    title: strings.title,
    description: strings.description(v),
    recommended_action: strings.action,
  };
}
