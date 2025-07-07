import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import Modal from './Modal';
import '../styles/ShopSelector.css';

const ShopSelector = ({ onShopSelect, onBack }) => {
  const [shops, setShops] = useState([]);
  const [selectedShops, setSelectedShops] = useState([]);
  const [newShop, setNewShop] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [shopToDelete, setShopToDelete] = useState(null);

  useEffect(() => {
    const savedShops = JSON.parse(localStorage.getItem('shops') || '[]');
    setShops(savedShops);
    setSelectedShops([]); // Cases décochées par défaut
    if (process.env.NODE_ENV !== 'production') {
      console.log('ShopSelector: Loaded shops from localStorage:', savedShops);
    }
  }, []);

  const handleAddShop = () => {
    if (newShop && !shops.includes(newShop.toUpperCase())) {
      const updatedShops = [...shops, newShop.toUpperCase()];
      setShops(updatedShops);
      localStorage.setItem('shops', JSON.stringify(updatedShops));
      setNewShop('');
      if (process.env.NODE_ENV !== 'production') {
        console.log('ShopSelector: Added shop:', newShop.toUpperCase());
      }
    }
  };

  const handleToggleShop = (shop) => {
    const updatedSelected = selectedShops.includes(shop)
      ? selectedShops.filter((s) => s !== shop)
      : [...selectedShops, shop];
    setSelectedShops(updatedSelected);
    if (process.env.NODE_ENV !== 'production') {
      console.log('ShopSelector: Toggled shop:', shop, 'New selection:', updatedSelected);
    }
  };

  const handleReset = () => {
    setShowConfirmReset(true);
  };

  const confirmReset = () => {
    setShops([]);
    setSelectedShops([]);
    localStorage.removeItem('shops');
    localStorage.removeItem('selectedShops');
    setShowConfirmReset(false);
    if (process.env.NODE_ENV !== 'production') {
      console.log('ShopSelector: Reset shops and cleared localStorage');
    }
  };

  const handleDeleteShop = (shop) => {
    setShopToDelete(shop);
  };

  const confirmDeleteShop = () => {
    const updatedShops = shops.filter((s) => s !== shopToDelete);
    const updatedSelected = selectedShops.filter((s) => s !== shopToDelete);
    setShops(updatedShops);
    setSelectedShops(updatedSelected);
    localStorage.setItem('shops', JSON.stringify(updatedShops));
    localStorage.setItem('selectedShops', JSON.stringify(updatedSelected));
    setShopToDelete(null);
    if (process.env.NODE_ENV !== 'production') {
      console.log('ShopSelector: Deleted shop:', shopToDelete);
    }
  };

  return (
    <div className="shop-selector-container">
      <h2>Sélectionner des boutiques</h2>
      <div className="add-shop-section">
        <input
          type="text"
          value={newShop}
          onChange={(e) => setNewShop(e.target.value)}
          placeholder="Nom de la boutique"
          className="shop-input"
        />
        <button onClick={handleAddShop} className="add-shop-btn">Ajouter</button>
      </div>
      <div className="shop-list">
        {shops.map((shop) => (
          <div key={shop} className="shop-item">
            <label>
              <input
                type="checkbox"
                checked={selectedShops.includes(shop)}
                onChange={() => handleToggleShop(shop)}
              />
              {shop}
            </label>
            <FaTimes
              className="delete-icon"
              onClick={() => handleDeleteShop(shop)}
              title={`Supprimer ${shop}`}
            />
          </div>
        ))}
      </div>
      <div className="action-buttons">
        <button
          className="validate-btn"
          onClick={() => onShopSelect(selectedShops)}
          disabled={selectedShops.length !== 1}
        >
          Valider
        </button>
        <div className="secondary-buttons">
          <button className="reset-button" onClick={handleReset} title="Réinitialiser la sélection des boutiques">
            Réinitialiser
          </button>
          <button
            className="back-btn"
            onClick={() => {
              if (process.env.NODE_ENV !== 'production') {
                console.log('ShopSelector: Returning to previous screen');
              }
              onBack();
            }}
            title="Retour"
          >
            Retour
          </button>
        </div>
      </div>
      <Modal
        isOpen={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        onConfirm={confirmReset}
        message="Voulez-vous vraiment réinitialiser la liste des boutiques ? Cela supprimera toutes les boutiques."
        style={{ fontFamily: 'Roboto', fontSize: '14px' }}
      />
      <Modal
        isOpen={!!shopToDelete}
        onClose={() => setShopToDelete(null)}
        onConfirm={confirmDeleteShop}
        message={`Voulez-vous vraiment supprimer la boutique ${shopToDelete} ?`}
        style={{ fontFamily: 'Roboto', fontSize: '14px' }}
      />
      <p className="copyright" style={{ fontFamily: 'Roboto', fontSize: '10px', color: '#666' }}>
        © Nicolas Lefevre 2025 Klick Planning
      </p>
    </div>
  );
};

export default ShopSelector;