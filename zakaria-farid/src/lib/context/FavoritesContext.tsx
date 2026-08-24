'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property } from '@/types';

interface FavoritesContextType {
  favoriteIds: string[];
  savedProperties: Property[];
  isFavorite: (idOrSlug: string) => boolean;
  toggleFavorite: (propertyOrId: Property | string) => boolean;
  addFavorite: (propertyOrId: Property | string) => void;
  removeFavorite: (idOrSlug: string) => void;
  clearFavorites: () => void;
  registerProperties: (properties: Property[]) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const IDS_STORAGE_KEY = 'zakaria_farid_saved_properties_v1';
const OBJECTS_STORAGE_KEY = 'zakaria_farid_saved_property_objects_v1';

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedIds = localStorage.getItem(IDS_STORAGE_KEY);
      let parsedIds: string[] = [];
      if (storedIds) {
        const parsed = JSON.parse(storedIds);
        if (Array.isArray(parsed)) {
          parsedIds = parsed.filter(Boolean);
          setFavoriteIds(parsedIds);
        }
      }

      const storedObjects = localStorage.getItem(OBJECTS_STORAGE_KEY);
      if (storedObjects) {
        const parsedObjects = JSON.parse(storedObjects);
        if (Array.isArray(parsedObjects)) {
          setSavedProperties(parsedObjects);
        }
      }
    } catch (e) {
      console.warn('Failed to load favorites from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sync to localStorage on update
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(IDS_STORAGE_KEY, JSON.stringify(favoriteIds));
      localStorage.setItem(OBJECTS_STORAGE_KEY, JSON.stringify(savedProperties));
    } catch (e) {
      console.warn('Failed to save favorites to localStorage', e);
    }
  }, [favoriteIds, savedProperties, isLoaded]);

  // Auto-Hydrate missing property objects from backend API if favoriteIds has IDs without objects
  useEffect(() => {
    if (!isLoaded || favoriteIds.length === 0) return;

    const missingIds = favoriteIds.filter(
      id => !savedProperties.some(p => p.id === id || p.slug === id)
    );

    if (missingIds.length === 0) return;

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/properties/saved?ids=${encodeURIComponent(missingIds.join(','))}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data?.properties && Array.isArray(data.properties) && data.properties.length > 0) {
          setSavedProperties(prev => {
            const existingKeys = new Set(prev.map(p => p.id || p.slug));
            const newProps: Property[] = [];
            for (const item of data.properties) {
              const key = item.id || item.slug;
              if (key && !existingKeys.has(key)) {
                existingKeys.add(key);
                
                // Format if raw DB item
                const images = item.images || (item.property_images ? item.property_images.map((im: any) => im.url) : ['/images/hero-modern-villa.png']);
                const formattedProp: Property = {
                  id: item.slug || item.id,
                  slug: item.slug || item.id,
                  title: item.title || item.title_en || item.title_ar || 'Luxury Property',
                  title_en: item.title_en || item.title || 'Luxury Property',
                  title_ar: item.title_ar || item.title || 'عقار فاخر',
                  location: item.location || 'Egypt',
                  district: item.district || (item.location ? item.location.split(',')[0].trim() : 'Prime District'),
                  estateName: item.estateName || (item.location ? item.location.split(',')[0].trim() : 'Prime Estate'),
                  description: item.description || item.description_en || item.description_ar || '',
                  description_en: item.description_en || '',
                  description_ar: item.description_ar || '',
                  narrative: item.narrative || item.description || '',
                  price: item.price || item.price_egp || 0,
                  price_egp: item.price_egp || item.price || 0,
                  currency: item.currency || 'EGP',
                  beds: item.beds ?? item.bedrooms ?? 0,
                  baths: item.baths ?? item.bathrooms ?? 0,
                  sqm: item.sqm ?? item.area_sqm ?? 0,
                  propertyType: item.propertyType || item.type || 'apartment',
                  type: item.type || 'apartment',
                  builtYear: item.builtYear || 2025,
                  featured: item.featured ?? item.is_featured ?? false,
                  is_featured: item.is_featured ?? item.featured ?? false,
                  images: images.length > 0 ? images : ['/images/hero-modern-villa.png'],
                  amenities: item.amenities || [],
                  mapCoordinates: item.mapCoordinates || { x: 50, y: 50, lat: item.latitude || 30.0444, lng: item.longitude || 31.2357 },
                  broker: item.broker || {
                    name: 'Zakaria Farid',
                    role: 'Direct Owner',
                    phone: '+201000000000',
                    email: 'contact@zakariafarid.com',
                    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
                  },
                };
                newProps.push(formattedProp);
              }
            }
            return [...prev, ...newProps];
          });
        }
      })
      .catch(err => {
        console.warn('Could not hydrate saved properties:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [favoriteIds, savedProperties, isLoaded]);

  const registerProperties = (properties: Property[]) => {
    if (!properties || !Array.isArray(properties) || properties.length === 0) return;
    setSavedProperties(prev => {
      const prevMap = new Map<string, Property>();
      for (const p of prev) {
        if (p.id) prevMap.set(p.id, p);
        if (p.slug) prevMap.set(p.slug, p);
      }

      let hasChanges = false;
      const updated = [...prev];

      for (const prop of properties) {
        const idMatch = prop.id && favoriteIds.includes(prop.id);
        const slugMatch = prop.slug && favoriteIds.includes(prop.slug);

        if (idMatch || slugMatch) {
          const key = prop.id || prop.slug;
          if (key && !prevMap.has(key)) {
            prevMap.set(key, prop);
            if (prop.slug) prevMap.set(prop.slug, prop);
            if (prop.id) prevMap.set(prop.id, prop);
            updated.push(prop);
            hasChanges = true;
          }
        }
      }

      return hasChanges ? updated : prev;
    });
  };

  const isFavorite = (idOrSlug: string): boolean => {
    if (!idOrSlug) return false;
    return favoriteIds.includes(idOrSlug) || savedProperties.some(p => p.id === idOrSlug || p.slug === idOrSlug);
  };

  const toggleFavorite = (propertyOrId: Property | string): boolean => {
    if (!propertyOrId) return false;

    const isObj = typeof propertyOrId === 'object' && propertyOrId !== null;
    const id = isObj ? (propertyOrId.id || propertyOrId.slug) : propertyOrId;
    const slug = isObj ? propertyOrId.slug : undefined;

    if (!id) return false;

    const alreadySaved = favoriteIds.includes(id) || (slug ? favoriteIds.includes(slug) : false) || savedProperties.some(p => p.id === id || (slug && p.slug === slug));

    if (alreadySaved) {
      // Remove
      setFavoriteIds(prev => prev.filter(item => item !== id && (!slug || item !== slug)));
      setSavedProperties(prev => prev.filter(p => p.id !== id && (!slug || p.slug !== slug)));
      return false;
    } else {
      // Add
      const idsToAdd = [id];
      if (slug && slug !== id) idsToAdd.push(slug);
      
      setFavoriteIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
      
      if (isObj) {
        setSavedProperties(prev => {
          const exists = prev.some(p => p.id === id || (slug && p.slug === slug));
          if (exists) return prev;
          return [propertyOrId, ...prev];
        });
      }
      return true;
    }
  };

  const addFavorite = (propertyOrId: Property | string) => {
    if (!propertyOrId) return;
    const isObj = typeof propertyOrId === 'object' && propertyOrId !== null;
    const id = isObj ? (propertyOrId.id || propertyOrId.slug) : propertyOrId;
    const slug = isObj ? propertyOrId.slug : undefined;

    if (!id) return;
    const idsToAdd = [id];
    if (slug && slug !== id) idsToAdd.push(slug);

    setFavoriteIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
    if (isObj) {
      setSavedProperties(prev => {
        const exists = prev.some(p => p.id === id || (slug && p.slug === slug));
        if (exists) return prev;
        return [propertyOrId, ...prev];
      });
    }
  };

  const removeFavorite = (idOrSlug: string) => {
    if (!idOrSlug) return;
    setFavoriteIds(prev => prev.filter(item => item !== idOrSlug));
    setSavedProperties(prev => prev.filter(p => p.id !== idOrSlug && p.slug !== idOrSlug));
  };

  const clearFavorites = () => {
    setFavoriteIds([]);
    setSavedProperties([]);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        savedProperties,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        clearFavorites,
        registerProperties,
        isDrawerOpen,
        setIsDrawerOpen,
        isLoading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
