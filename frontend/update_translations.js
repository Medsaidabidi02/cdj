const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');

// Define the translations for each language
const newTranslations = {
  fr: {
    footer: {
      legal_privacy: "Politique de Confidentialité",
      legal_terms: "Conditions Générales (CGV/CGU)"
    },
    auth: {
      signup: {
        legal_consent_1: "J'ai lu et j'accepte les ",
        legal_consent_2: "Conditions Générales de Vente",
        legal_consent_3: " et la ",
        legal_consent_4: "Politique de Confidentialité",
        legal_consent_5: "."
      }
    },
    legal_terms: {
      title: "Conditions Générales de Vente et d'Utilisation (CGV / CGU)",
      last_updated: "Dernière mise à jour : {{date}}",
      back_home: "Retour à l'accueil",
      art1_title: "Article 1 : Mentions Légales",
      art1_p1: "Le présent site web, accessible à l'adresse <1>cliniquedesjuristes.com</1>, est édité et exploité par la <3>Clinique des Juristes</3>, une Société Unipersonnelle à Responsabilité Limitée (SUARL).",
      art1_li1: "<1>Siège social :</1> 1029 Bab Souika, Tunis, Tunisie",
      art1_li2: "<1>Matricule Fiscal / RNE :</1> 1848202A",
      art1_li3: "<1>Gérance :</1> Mme Marwa Barhoumi",
      art1_li4: "<1>Contact :</1> contact@cliniquedesjuristes.com",
      "art2_title": "Article 2 : Objet",
      "art2_p1": "Les présentes Conditions Générales régissent l'utilisation de la plateforme en ligne \"Clinique des Juristes\" ainsi que les conditions d'achat et d'accès aux formations continues, vidéos éducatives et supports pédagogiques (ci-après \"les Services\") proposés aux utilisateurs (ci-après \"l'Étudiant\" ou \"le Client\").",
      "art3_title": "Article 3 : Création de compte et Accès",
      "art3_p1": "La navigation sur le site est libre. Toutefois, l'achat et l'accès aux cours nécessitent la création d'un compte utilisateur. Lors de l'inscription, l'utilisateur s'engage à fournir des informations exactes et à les maintenir à jour.",
      "art3_p2": "Le compte est strictement personnel. L'utilisateur est seul responsable de la confidentialité de ses identifiants. Tout partage de compte, revente d'accès ou tentative de connexion simultanée depuis de multiples appareils non autorisés pourra entraîner la suspension immédiate et définitive du compte sans préavis ni remboursement.",
      "art4_title": "Article 4 : Tarifs et Modalités de Paiement",
      "art4_p1": "Les prix de nos formations sont indiqués en Dinar Tunisien (TND), toutes taxes comprises (TTC). La Clinique des Juristes se réserve le droit de modifier ses prix à tout moment, mais les formations seront facturées sur la base des tarifs en vigueur au moment de la validation de la commande.",
      "art4_p2": "<1>Paiement en ligne :</1> Le règlement des achats s'effectue de manière sécurisée via la passerelle de paiement <3>Flouci</3>. Nous acceptons les paiements par cartes bancaires nationales et via l'application mobile Flouci. Les coordonnées bancaires ne sont à aucun moment transmises ou stockées sur les serveurs de la Clinique des Juristes.",
      "art5_title": "Article 5 : Accès aux formations (Livraison)",
      "art5_p1": "Étant donné la nature numérique de nos services, la \"livraison\" est dématérialisée. L'accès aux formations vidéos et aux documents associés est accordé <1>instantanément</1> après la confirmation et la validation du paiement par Flouci. L'étudiant pourra retrouver l'ensemble de ses contenus achetés dans son espace personnel \"My Learning\".",
      "art6_title": "Article 6 : Droit de rétractation et Remboursement",
      "art6_alert": "Attention : Exception au droit de rétractation pour les contenus numériques.",
      "art6_p1": "Conformément à l'Article 30 de la <1>Loi n° 2000-83 du 9 août 2000</1> relative aux échanges et au commerce électroniques en Tunisie, le consommateur dispose généralement d'un délai de 10 jours pour se rétracter.",
      "art6_p2": "Toutefois, en application de l'Article 29 de cette même loi, ce droit de rétractation <1>ne peut être exercé</1> pour les contrats de fourniture de services dont l'exécution a commencé, avec l'accord du consommateur, avant la fin du délai de rétractation.",
      "art6_p3": "En validant votre achat sur notre plateforme, vous acceptez expressément que l'exécution du service (accès immédiat aux vidéos et documents) commence instantanément. Par conséquent, <1>vous renoncez définitivement à votre droit de rétractation</1>. Aucun retour, échange ou remboursement ne sera accordé une fois l'accès à la formation activé sur votre compte.",
      "art7_title": "Article 7 : Propriété Intellectuelle",
      "art7_p1": "L'ensemble des contenus présents sur la plateforme (vidéos, textes, logos, documents PDF, code source) est la propriété exclusive de la Clinique des Juristes et est protégé par les lois tunisiennes et internationales relatives à la propriété intellectuelle.",
      "art7_p2": "L'achat d'une formation vous confère un droit d'accès personnel, non exclusif et non transférable. Toute reproduction, représentation, modification, publication, transmission ou dénaturation, totale ou partielle, des contenus, par quelque procédé que ce soit, et sur quelque support que ce soit, est strictement interdite et fera l'objet de poursuites judiciaires.",
      "art8_title": "Article 8 : Responsabilité et Support",
      "art8_p1": "La Clinique des Juristes s'engage à mettre en œuvre tous les moyens raisonnables pour assurer un accès continu à la plateforme (24h/24, 7j/7). Toutefois, nous déclinons toute responsabilité en cas d'indisponibilité temporaire due à des opérations de maintenance, des pannes de serveur, ou des cas de force majeure.",
      "art9_title": "Article 9 : Droit applicable et Règlement des litiges",
      "art9_p1": "Les présentes Conditions Générales sont régies et interprétées conformément au <1>droit tunisien</1>.",
      "art9_p2": "En cas de litige relatif à l'interprétation ou à l'exécution de ces conditions, les parties s'engagent à rechercher d'abord une solution à l'amiable en contactant le support. À défaut d'accord amiable, le litige sera soumis à la compétence exclusive des juridictions de Tunis."
    },
    legal_privacy: {
      title: "Politique de Confidentialité",
      sec1_title: "1. Introduction",
      sec1_p1: "La protection de vos données personnelles est une priorité pour la <1>Clinique des Juristes</1>. La présente Politique de Confidentialité vous informe de la manière dont nous recueillons, utilisons et protégeons vos données lorsque vous visitez et utilisez notre site web (cliniquedesjuristes.com).",
      sec1_p2: "Cette politique est établie en conformité avec la <1>Loi n° 2004-63 du 27 juillet 2004</1> portant sur la protection des données à caractère personnel en Tunisie (Instance Nationale de Protection des Données Personnelles - INPDP).",
      sec2_title: "2. Données collectées",
      sec2_p1: "Lors de votre utilisation de notre plateforme, nous pouvons être amenés à collecter les données suivantes :",
      sec2_li1: "<1>Données d'identification :</1> Nom, prénom, adresse e-mail, numéro de téléphone.",
      sec2_li2: "<1>Données de connexion et d'usage :</1> Adresse IP, type de navigateur, système d'exploitation, historique de navigation sur nos vidéos (progression d'apprentissage, temps de visionnage).",
      sec2_alert: "Important : Informations de paiement",
      sec2_p2: "Les transactions financières sont gérées par notre partenaire de paiement sécurisé, <1>Flouci</1>. À aucun moment, la Clinique des Juristes ne collecte, ne traite ni ne stocke vos coordonnées bancaires ou informations de carte de crédit sur ses serveurs.",
      sec3_title: "3. Finalité de la collecte des données",
      sec3_p1: "Vos données personnelles sont collectées dans les buts exclusifs suivants :",
      sec3_li1: "La création, la gestion et la sécurisation de votre compte utilisateur.",
      sec3_li2: "Le traitement de vos commandes et l'activation de vos accès aux formations.",
      sec3_li3: "Le suivi pédagogique de votre progression (sauvegarde de la reprise de lecture des vidéos).",
      sec3_li4: "La communication avec vous (envoi de factures, notifications de nouveaux cours, assistance technique).",
      sec3_li5: "L'amélioration de l'expérience utilisateur et l'optimisation technique de la plateforme.",
      sec4_title: "4. Partage et protection des données",
      sec4_p1: "La Clinique des Juristes s'engage à ne jamais vendre, louer ou céder vos données personnelles à des tiers à des fins commerciales.",
      sec4_p2: "Vos données ne sont partagées qu'avec les sous-traitants techniques strictement nécessaires au fonctionnement du service (tels que notre hébergeur web et le prestataire de paiement Flouci, qui sont eux-mêmes soumis à de strictes obligations de confidentialité et de sécurité).",
      sec4_p3: "Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles (chiffrement SSL, mots de passe hachés, limitation des accès) pour protéger vos données contre tout accès non autorisé, altération ou destruction.",
      sec5_title: "5. Durée de conservation des données",
      sec5_p1: "Vos données personnelles sont conservées pendant la durée stricte nécessaire aux finalités pour lesquelles elles ont été collectées.",
      sec5_li1: "Les données relatives à votre compte (profil, progression) sont conservées tant que votre compte est actif.",
      sec5_li2: "En cas de suppression de compte, les données liées aux transactions financières (historique des paiements) seront conservées pendant la durée légale requise par le Code de Commerce tunisien (10 ans).",
      sec6_title: "6. Utilisation des Cookies",
      sec6_p1: "Notre site utilise des cookies (fichiers textes placés sur votre appareil) pour assurer le bon fonctionnement de la plateforme :",
      sec6_li1: "<1>Cookies strictement nécessaires :</1> Ils permettent de vous maintenir connecté(e) et de sécuriser votre session.",
      sec6_li2: "<1>Cookies de performance :</1> Ils nous aident à comprendre comment notre site est utilisé afin de l'améliorer.",
      sec6_p2: "Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela pourrait restreindre l'accès à certaines fonctionnalités essentielles de la plateforme (notamment la connexion à votre compte).",
      sec7_title: "7. Vos droits (INPDP)",
      sec7_p1: "Conformément à la législation tunisienne, vous disposez des droits suivants concernant vos données personnelles :",
      sec7_li1: "<1>Droit d'accès :</1> Vous pouvez demander à consulter les données que nous détenons sur vous.",
      sec7_li2: "<1>Droit de rectification :</1> Vous pouvez corriger ou mettre à jour vos données inexactes depuis votre profil ou en nous contactant.",
      sec7_li3: "<1>Droit d'opposition et de suppression :</1> Vous pouvez demander la suppression de votre compte et de vos données personnelles (sous réserve des obligations légales de conservation).",
      sec8_title: "8. Nous contacter",
      sec8_p1: "Pour toute question relative à cette Politique de Confidentialité ou pour exercer vos droits, vous pouvez nous contacter :",
      sec8_li1: "Par e-mail : contact@cliniquedesjuristes.com",
      sec8_li2: "Par courrier : 1029 Bab Souika, Tunis, Tunisie",
      sec8_p2: "Une réponse vous sera adressée dans un délai maximum de 30 jours à compter de la réception de votre demande."
    }
  },
  en: {
    footer: {
      legal_privacy: "Privacy Policy",
      legal_terms: "Terms of Service (CGV/CGU)"
    },
    auth: {
      signup: {
        legal_consent_1: "I have read and accept the ",
        legal_consent_2: "Terms of Sale",
        legal_consent_3: " and the ",
        legal_consent_4: "Privacy Policy",
        legal_consent_5: "."
      }
    },
    legal_terms: {
      title: "Terms of Service and Sale (CGV / CGU)",
      last_updated: "Last updated: {{date}}",
      back_home: "Back to Home",
      art1_title: "Article 1: Legal Notice",
      art1_p1: "This website, accessible at <1>cliniquedesjuristes.com</1>, is published and operated by <3>Clinique des Juristes</3>, a Single-Member Limited Liability Company (SUARL).",
      art1_li1: "<1>Head Office:</1> 1029 Bab Souika, Tunis, Tunisia",
      art1_li2: "<1>Tax ID / RNE:</1> 1848202A",
      art1_li3: "<1>Manager:</1> Mrs. Marwa Barhoumi",
      art1_li4: "<1>Contact:</1> contact@cliniquedesjuristes.com",
      art2_title: "Article 2: Purpose",
      art2_p1: "These General Terms and Conditions govern the use of the online platform \"Clinique des Juristes\" as well as the conditions for purchasing and accessing continuous training, educational videos, and learning materials (hereinafter \"the Services\") offered to users (hereinafter \"the Student\" or \"the Customer\").",
      art3_title: "Article 3: Account Creation and Access",
      art3_p1: "Browsing the site is free. However, purchasing and accessing courses require the creation of a user account. Upon registration, the user agrees to provide accurate information and to keep it updated.",
      art3_p2: "The account is strictly personal. The user is solely responsible for the confidentiality of their credentials. Any account sharing, resale of access, or attempt to log in simultaneously from multiple unauthorized devices may result in immediate and permanent account suspension without notice or refund.",
      art4_title: "Article 4: Pricing and Payment Methods",
      art4_p1: "The prices of our courses are indicated in Tunisian Dinars (TND), all taxes included (TTC). Clinique des Juristes reserves the right to modify its prices at any time, but courses will be billed based on the rates in effect at the time of order validation.",
      art4_p2: "<1>Online Payment:</1> Purchases are securely settled via the <3>Flouci</3> payment gateway. We accept payments by national bank cards and via the Flouci mobile app. Your banking details are never transmitted or stored on the servers of Clinique des Juristes.",
      art5_title: "Article 5: Access to Courses (Delivery)",
      art5_p1: "Given the digital nature of our services, \"delivery\" is dematerialized. Access to video courses and associated documents is granted <1>instantly</1> upon confirmation and validation of payment by Flouci. Students can find all their purchased content in their personal \"My Learning\" space.",
      art6_title: "Article 6: Right of Withdrawal and Refunds",
      art6_alert: "Important: Exception to the right of withdrawal for digital content.",
      art6_p1: "In accordance with Article 30 of <1>Law No. 2000-83 of August 9, 2000</1> relating to electronic exchanges and commerce in Tunisia, consumers generally have a 10-day period to withdraw.",
      art6_p2: "However, pursuant to Article 29 of the same law, this right of withdrawal <1>cannot be exercised</1> for service supply contracts whose execution has begun, with the consumer's agreement, before the end of the withdrawal period.",
      art6_p3: "By validating your purchase on our platform, you expressly agree that the execution of the service (immediate access to videos and documents) begins instantly. Consequently, <1>you definitively waive your right of withdrawal</1>. No returns, exchanges, or refunds will be granted once access to the course is activated on your account.",
      art7_title: "Article 7: Intellectual Property",
      art7_p1: "All content present on the platform (videos, texts, logos, PDF documents, source code) is the exclusive property of Clinique des Juristes and is protected by Tunisian and international intellectual property laws.",
      art7_p2: "Purchasing a course grants you a personal, non-exclusive, and non-transferable right of access. Any reproduction, representation, modification, publication, transmission, or distortion, whether total or partial, of the content, by any process whatsoever, and on any medium whatsoever, is strictly prohibited and will be subject to legal action.",
      art8_title: "Article 8: Liability and Support",
      art8_p1: "Clinique des Juristes commits to taking all reasonable measures to ensure continuous access to the platform (24/7). However, we decline all responsibility in the event of temporary unavailability due to maintenance operations, server failures, or force majeure events.",
      art9_title: "Article 9: Applicable Law and Dispute Resolution",
      art9_p1: "These General Terms and Conditions are governed by and interpreted in accordance with <1>Tunisian law</1>.",
      art9_p2: "In the event of a dispute relating to the interpretation or execution of these conditions, the parties agree to first seek an amicable solution by contacting support. Failing an amicable agreement, the dispute will be submitted to the exclusive jurisdiction of the courts of Tunis."
    },
    legal_privacy: {
      title: "Privacy Policy",
      sec1_title: "1. Introduction",
      sec1_p1: "Protecting your personal data is a priority for <1>Clinique des Juristes</1>. This Privacy Policy informs you about how we collect, use, and protect your data when you visit and use our website (cliniquedesjuristes.com).",
      sec1_p2: "This policy is established in compliance with <1>Law No. 2004-63 of July 27, 2004</1> on the protection of personal data in Tunisia (National Authority for Protection of Personal Data - INPDP).",
      sec2_title: "2. Data Collected",
      sec2_p1: "During your use of our platform, we may collect the following data:",
      sec2_li1: "<1>Identification data:</1> First name, last name, email address, phone number.",
      sec2_li2: "<1>Connection and usage data:</1> IP address, browser type, operating system, browsing history on our videos (learning progress, watch time).",
      sec2_alert: "Important: Payment Information",
      sec2_p2: "Financial transactions are managed by our secure payment partner, <1>Flouci</1>. At no time does Clinique des Juristes collect, process, or store your bank details or credit card information on its servers.",
      sec3_title: "3. Purpose of Data Collection",
      sec3_p1: "Your personal data is collected for the following exclusive purposes:",
      sec3_li1: "Creation, management, and security of your user account.",
      sec3_li2: "Processing your orders and activating your access to courses.",
      sec3_li3: "Educational tracking of your progress (saving your video playback position).",
      sec3_li4: "Communicating with you (sending invoices, new course notifications, technical support).",
      sec3_li5: "Improving user experience and technical optimization of the platform.",
      sec4_title: "4. Data Sharing and Protection",
      sec4_p1: "Clinique des Juristes is committed to never selling, renting, or transferring your personal data to third parties for commercial purposes.",
      sec4_p2: "Your data is only shared with technical subcontractors strictly necessary for the operation of the service (such as our web host and the Flouci payment gateway, which are themselves subject to strict confidentiality and security obligations).",
      sec4_p3: "We implement technical and organizational security measures (SSL encryption, hashed passwords, access limitation) to protect your data against unauthorized access, alteration, or destruction.",
      sec5_title: "5. Data Retention Period",
      sec5_p1: "Your personal data is kept for the strict time necessary for the purposes for which it was collected.",
      sec5_li1: "Data related to your account (profile, progress) is kept as long as your account is active.",
      sec5_li2: "In the event of account deletion, data related to financial transactions (payment history) will be kept for the legal period required by the Tunisian Commercial Code (10 years).",
      sec6_title: "6. Use of Cookies",
      sec6_p1: "Our site uses cookies (text files placed on your device) to ensure the proper functioning of the platform:",
      sec6_li1: "<1>Strictly necessary cookies:</1> They allow you to stay logged in and secure your session.",
      sec6_li2: "<1>Performance cookies:</1> They help us understand how our site is used in order to improve it.",
      sec6_p2: "You can configure your browser to refuse cookies, but this may restrict access to certain essential features of the platform (especially logging into your account).",
      sec7_title: "7. Your Rights (INPDP)",
      sec7_p1: "In accordance with Tunisian legislation, you have the following rights regarding your personal data:",
      sec7_li1: "<1>Right of access:</1> You can request to view the data we hold about you.",
      sec7_li2: "<1>Right to rectification:</1> You can correct or update your inaccurate data from your profile or by contacting us.",
      sec7_li3: "<1>Right to object and delete:</1> You can request the deletion of your account and personal data (subject to legal retention obligations).",
      sec8_title: "8. Contact Us",
      sec8_p1: "For any questions regarding this Privacy Policy or to exercise your rights, you can contact us:",
      sec8_li1: "By email: contact@cliniquedesjuristes.com",
      sec8_li2: "By mail: 1029 Bab Souika, Tunis, Tunisia",
      sec8_p2: "A response will be sent to you within a maximum period of 30 days from the receipt of your request."
    }
  },
  ar: {
    footer: {
      legal_privacy: "سياسة الخصوصية",
      legal_terms: "الشروط والأحكام العامة (CGV/CGU)"
    },
    auth: {
      signup: {
        legal_consent_1: "لقد قرأت وأوافق على ",
        legal_consent_2: "الشروط والأحكام العامة للبيع",
        legal_consent_3: " و ",
        legal_consent_4: "سياسة الخصوصية",
        legal_consent_5: "."
      }
    },
    legal_terms: {
      title: "الشروط والأحكام العامة للبيع والاستخدام (CGV / CGU)",
      last_updated: "آخر تحديث : {{date}}",
      back_home: "العودة إلى الصفحة الرئيسية",
      art1_title: "المادة 1 : الإشعارات القانونية",
      art1_p1: "يتم نشر وإدارة هذا الموقع الإلكتروني، الذي يمكن الوصول إليه على <1>cliniquedesjuristes.com</1>، من قبل <3>Clinique des Juristes</3>، وهي شركة ذات مسؤولية محدودة للشخص الواحد (SUARL).",
      art1_li1: "<1>المقر الرئيسي:</1> 1029 باب سويقة، تونس، الجمهورية التونسية",
      art1_li2: "<1>المعرف الجبائي / RNE:</1> 1848202A",
      art1_li3: "<1>الإدارة:</1> السيدة مروى البرهومي",
      art1_li4: "<1>اتصل بنا:</1> contact@cliniquedesjuristes.com",
      art2_title: "المادة 2 : الغرض",
      art2_p1: "تُنظم هذه الشروط العامة استخدام المنصة الإلكترونية \"Clinique des Juristes\" بالإضافة إلى شروط شراء والوصول إلى التكوين المستمر ومقاطع الفيديو التعليمية والمواد التعليمية (المشار إليها فيما يلي بـ \"الخدمات\") المقدمة للمستخدمين (المشار إليهم فيما يلي بـ \"الطالب\" أو \"العميل\").",
      art3_title: "المادة 3 : إنشاء الحساب والوصول",
      art3_p1: "تصفح الموقع مجاني. ومع ذلك، فإن شراء الدورات والوصول إليها يتطلب إنشاء حساب مستخدم. عند التسجيل، يوافق المستخدم على تقديم معلومات دقيقة وتحديثها.",
      art3_p2: "الحساب شخصي بحت. المستخدم هو المسؤول الوحيد عن سرية بيانات الاعتماد الخاصة به. قد تؤدي أي مشاركة للحساب أو إعادة بيع حق الوصول أو محاولة تسجيل الدخول في وقت واحد من أجهزة متعددة غير مصرح بها إلى الإيقاف الفوري والدائم للحساب دون إشعار أو استرداد.",
      art4_title: "المادة 4 : الأسعار وطرق الدفع",
      art4_p1: "أسعار دوراتنا محددة بالدينار التونسي (TND)، شاملة لجميع الضرائب (TTC). تحتفظ Clinique des Juristes بالحق في تعديل أسعارها في أي وقت، ولكن سيتم محاسبة الدورات بناءً على الأسعار السارية وقت تأكيد الطلب.",
      art4_p2: "<1>الدفع عبر الإنترنت:</1> تتم تسوية عمليات الشراء بشكل آمن عبر بوابة الدفع <3>Flouci</3>. نحن نقبل المدفوعات بواسطة البطاقات المصرفية الوطنية وعبر تطبيق الهاتف المحمول Flouci. لا يتم إرسال أو تخزين بياناتك المصرفية في أي وقت على خوادم Clinique des Juristes.",
      art5_title: "المادة 5 : الوصول إلى الدورات (التسليم)",
      art5_p1: "نظرًا للطبيعة الرقمية لخدماتنا، فإن \"التسليم\" يتم بشكل إلكتروني. يتم منح حق الوصول إلى دورات الفيديو والمستندات المرتبطة بها <1>على الفور</1> بعد تأكيد الدفع بواسطة Flouci. يمكن للطلاب العثور على جميع محتوياتهم المشتراة في مساحتهم الشخصية \"My Learning\".",
      art6_title: "المادة 6 : حق التراجع والاسترداد",
      art6_alert: "تنبيه : استثناء لحق التراجع للمحتويات الرقمية.",
      art6_p1: "وفقًا للمادة 30 من <1>القانون عدد 83 لسنة 2000 المؤرخ في 9 أوت 2000</1> المتعلق بالمبادلات والتجارة الإلكترونية في تونس، يتمتع المستهلكون عمومًا بفترة 10 أيام للتراجع.",
      art6_p2: "ومع ذلك، وتطبيقا للمادة 29 من نفس القانون، <1>لا يمكن ممارسة</1> حق التراجع هذا بالنسبة لعقود توريد الخدمات التي بدأ تنفيذها، بموافقة المستهلك، قبل نهاية فترة التراجع.",
      art6_p3: "من خلال تأكيد الشراء على منصتنا، فإنك توافق صراحة على أن تنفيذ الخدمة (الوصول الفوري إلى مقاطع الفيديو والمستندات) يبدأ على الفور. وبالتالي، <1>فإنك تتنازل نهائيا عن حقك في التراجع</1>. لن يتم منح أي إرجاع أو استبدال أو استرداد بمجرد تنشيط الوصول إلى الدورة على حسابك.",
      art7_title: "المادة 7 : الملكية الفكرية",
      art7_p1: "جميع المحتويات الموجودة على المنصة (مقاطع الفيديو، النصوص، الشعارات، مستندات PDF، الكود المصدري) هي ملكية حصرية لـ Clinique des Juristes ومحمية بموجب القوانين التونسية والدولية المتعلقة بالملكية الفكرية.",
      art7_p2: "يمنحك شراء الدورة التدريبية حق وصول شخصي غير حصري وغير قابل للتحويل. يمنع منعا باتا أي نسخ أو تمثيل أو تعديل أو نشر أو نقل أو تشويه، سواء كان كليا أو جزئيا، للمحتوى، بأي وسيلة كانت، وعلى أي وسيط كان، وسيكون عرضة للملاحقة القانونية.",
      art8_title: "المادة 8 : المسؤولية والدعم",
      art8_p1: "تلتزم Clinique des Juristes باتخاذ جميع التدابير المعقولة لضمان الوصول المستمر إلى المنصة (24/7). ومع ذلك، نحن نخلي مسؤوليتنا في حالة عدم التوفر المؤقت بسبب عمليات الصيانة أو أعطال الخادم أو حالات القوة القاهرة.",
      art9_title: "المادة 9 : القانون المعمول به وحل النزاعات",
      art9_p1: "تخضع هذه الشروط والأحكام العامة وتفسر وفقا <1>للقانون التونسي</1>.",
      art9_p2: "في حالة وجود نزاع يتعلق بتفسير أو تنفيذ هذه الشروط، يوافق الطرفان على السعي أولاً للوصول إلى حل ودي عن طريق الاتصال بالدعم. في حالة عدم التوصل إلى اتفاق ودي، سيتم تقديم النزاع إلى الاختصاص الحصري لمحاكم تونس."
    },
    legal_privacy: {
      title: "سياسة الخصوصية",
      sec1_title: "1. مقدمة",
      sec1_p1: "حماية بياناتك الشخصية هي أولوية بالنسبة لـ <1>Clinique des Juristes</1>. تُعلمك سياسة الخصوصية هذه بكيفية جمع بياناتك واستخدامها وحمايتها عند زيارة واستخدام موقعنا الإلكتروني (cliniquedesjuristes.com).",
      sec1_p2: "تم وضع هذه السياسة وفقًا <1>للقانون عدد 63 لسنة 2004 المؤرخ في 27 جويلية 2004</1> المتعلق بحماية المعطيات الشخصية في تونس (الهيئة الوطنية لحماية المعطيات الشخصية - INPDP).",
      sec2_title: "2. البيانات التي يتم جمعها",
      sec2_p1: "أثناء استخدامك لمنصتنا، قد نقوم بجمع البيانات التالية:",
      sec2_li1: "<1>بيانات الهوية:</1> الاسم واللقب، عنوان البريد الإلكتروني، رقم الهاتف.",
      sec2_li2: "<1>بيانات الاتصال والاستخدام:</1> عنوان IP، نوع المتصفح، نظام التشغيل، سجل التصفح لمقاطع الفيديو الخاصة بنا (تقدم التعلم، وقت المشاهدة).",
      sec2_alert: "هام: معلومات الدفع",
      sec2_p2: "تتم إدارة المعاملات المالية بواسطة شريك الدفع الآمن الخاص بنا، <1>Flouci</1>. في أي وقت من الأوقات، لا تقوم Clinique des Juristes بجمع أو معالجة أو تخزين بياناتك المصرفية أو معلومات بطاقة الائتمان على خوادمها.",
      sec3_title: "3. الغرض من جمع البيانات",
      sec3_p1: "يتم جمع بياناتك الشخصية للأغراض الحصرية التالية:",
      sec3_li1: "إنشاء وإدارة وتأمين حساب المستخدم الخاص بك.",
      sec3_li2: "معالجة طلباتك وتفعيل وصولك إلى الدورات التدريبية.",
      sec3_li3: "المتابعة التعليمية لتقدمك (حفظ موضع تشغيل الفيديو الخاص بك).",
      sec3_li4: "التواصل معك (إرسال الفواتير، إشعارات الدورات الجديدة، الدعم الفني).",
      sec3_li5: "تحسين تجربة المستخدم والتحسين التقني للمنصة.",
      sec4_title: "4. مشاركة وحماية البيانات",
      sec4_p1: "تلتزم Clinique des Juristes بعدم بيع أو تأجير أو نقل بياناتك الشخصية إلى أطراف ثالثة لأغراض تجارية.",
      sec4_p2: "تتم مشاركة بياناتك فقط مع المقاولين التقنيين من الباطن الضروريين بدقة لتشغيل الخدمة (مثل مضيف الويب الخاص بنا وبوابة الدفع Flouci، والتي تخضع بدورها لالتزامات صارمة بالسرية والأمان).",
      sec4_p3: "نحن ننفذ تدابير أمنية تقنية وتنظيمية (تشفير SSL، كلمات مرور مجزأة، تقييد الوصول) لحماية بياناتك من الوصول غير المصرح به أو التغيير أو الإتلاف.",
      sec5_title: "5. فترة الاحتفاظ بالبيانات",
      sec5_p1: "يتم الاحتفاظ ببياناتك الشخصية للفترة اللازمة بدقة للأغراض التي تم جمعها من أجلها.",
      sec5_li1: "يتم الاحتفاظ بالبيانات المتعلقة بحسابك (الملف الشخصي، التقدم) طالما أن حسابك نشط.",
      sec5_li2: "في حالة حذف الحساب، سيتم الاحتفاظ بالبيانات المتعلقة بالمعاملات المالية (سجل الدفع) للفترة القانونية التي تتطلبها المجلة التجارية التونسية (10 سنوات).",
      sec6_title: "6. استخدام ملفات تعريف الارتباط (Cookies)",
      sec6_p1: "يستخدم موقعنا ملفات تعريف الارتباط (ملفات نصية توضع على جهازك) لضمان حسن سير المنصة:",
      sec6_li1: "<1>ملفات تعريف الارتباط الضرورية للغاية:</1> تسمح لك بالبقاء مسجلاً للدخول وتأمين جلستك.",
      sec6_li2: "<1>ملفات تعريف الارتباط الخاصة بالأداء:</1> تساعدنا على فهم كيفية استخدام موقعنا من أجل تحسينه.",
      sec6_p2: "يمكنك تهيئة متصفحك لرفض ملفات تعريف الارتباط، ولكن هذا قد يقيد الوصول إلى بعض الميزات الأساسية للمنصة (خاصة تسجيل الدخول إلى حسابك).",
      sec7_title: "7. حقوقك (INPDP)",
      sec7_p1: "وفقا للتشريعات التونسية، لديك الحقوق التالية فيما يتعلق ببياناتك الشخصية:",
      sec7_li1: "<1>حق الوصول:</1> يمكنك طلب الاطلاع على البيانات التي نحتفظ بها عنك.",
      sec7_li2: "<1>حق التصحيح:</1> يمكنك تصحيح أو تحديث بياناتك غير الدقيقة من ملفك الشخصي أو عن طريق الاتصال بنا.",
      sec7_li3: "<1>حق الاعتراض والحذف:</1> يمكنك طلب حذف حسابك وبياناتك الشخصية (مع مراعاة التزامات الاحتفاظ القانونية).",
      sec8_title: "8. اتصل بنا",
      sec8_p1: "لأي أسئلة تتعلق بسياسة الخصوصية هذه أو لممارسة حقوقك، يمكنك الاتصال بنا:",
      sec8_li1: "عبر البريد الإلكتروني: contact@cliniquedesjuristes.com",
      sec8_li2: "عبر البريد: 1029 باب سويقة، تونس، الجمهورية التونسية",
      sec8_p2: "سيتم إرسال رد إليك في غضون فترة أقصاها 30 يومًا من استلام طلبك."
    }
  }
};

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

async function updateTranslationFiles() {
  const languages = ['fr', 'en', 'ar'];

  for (const lang of languages) {
    const filePath = path.join(localesDir, lang, 'translation.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const json = JSON.parse(data);

      mergeDeep(json, newTranslations[lang]);

      fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
      console.log(`Updated ${lang}/translation.json`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
  }
}

updateTranslationFiles();
