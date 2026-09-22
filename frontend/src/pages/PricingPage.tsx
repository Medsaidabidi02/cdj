import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-4xl mx-auto py-16 px-4">
        <h1 className="text-4xl font-bold text-center mb-4">Tarifs et Abonnements</h1>
        <p className="text-xl text-gray-600 text-center mb-12">
          Un tarif unique et transparent pour accéder à tout le contenu de la Clinique des Juristes.
        </p>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-lg mx-auto">
          <div className="p-8 bg-blue-50 text-center">
            <h2 className="text-2xl font-semibold text-blue-900 mb-2">Abonnement Mensuel</h2>
            <div className="flex justify-center items-end gap-2">
              <span className="text-5xl font-bold text-blue-900">25</span>
              <span className="text-xl text-blue-700 mb-1">TND / mois</span>
            </div>
            <p className="text-sm text-blue-600 mt-2 font-medium">Prix TTC (Toutes Taxes Comprises)</p>
          </div>
          
          <div className="p-8">
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span className="text-gray-700"><strong>Description du produit :</strong> Accès complet et illimité à toutes les vidéos de cours et de révision qui vous sont assignées par l'administration.</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span className="text-gray-700"><strong>Durée :</strong> Valable pour 30 jours à partir de la date de paiement.</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span className="text-gray-700"><strong>Frais supplémentaires :</strong> 0 TND. Aucun frais caché ou supplémentaire.</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span className="text-gray-700"><strong>Livraison :</strong> Numérique et immédiate après le paiement.</span>
              </li>
            </ul>
            
            <Link 
              to="/login" 
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              S'inscrire / Se connecter
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Le paiement est sécurisé par notre partenaire Flouci.</p>
          <p>Pour plus d'informations, consultez nos <Link to="/cgv" className="text-blue-600 hover:underline">Conditions Générales de Vente</Link>.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PricingPage;