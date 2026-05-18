import { useMemo, useState } from 'react';
import { CheckIcon, PlusIcon, TrashIcon } from '../icons/UIIcons';
import { useTranslation } from '../../hooks/useTranslation';

interface ShoppingListItem {
  id: number;
  text: string;
  purchased: boolean;
}

export function ShoppingList({ language }: { language: string }) {
  const { t } = useTranslation(language);
  const [items, setItems] = useState<ShoppingListItem[]>([
    { id: 1, text: 'Hero energy drink', purchased: false },
    { id: 2, text: 'Sparkle stickers', purchased: false },
    { id: 3, text: 'Potion snack', purchased: false },
  ]);
  const [draft, setDraft] = useState('');

  const remaining = useMemo(() => items.filter((item) => !item.purchased).length, [items]);

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      { id: Date.now(), text: trimmed, purchased: false },
    ]);
    setDraft('');
  };

  const toggleItem = (id: number) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, purchased: !item.purchased } : item));
  };

  const clearPurchased = () => {
    setItems((prev) => prev.filter((item) => !item.purchased));
  };

  return (
    <div className="page-enter">
      <div className="tq-card tq-card-padded">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ minWidth: 220 }}>
            <h2>{t('shoppingList.title')}</h2>
            <p style={{ color: 'var(--warm-text-light)', margin: '8px 0 0', maxWidth: 560 }}>{t('shoppingList.description')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="tq-btn tq-btn-secondary" onClick={clearPurchased} disabled={!items.some((item) => item.purchased)}>
              <TrashIcon /> {t('shoppingList.clearPurchased')}
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addItem()}
                placeholder={t('shoppingList.placeholder')}
                style={{ minWidth: 240, flex: '1 1 240px', borderRadius: 16, border: '1px solid var(--warm-border)', padding: '12px 14px', background: 'var(--warm-surface)', color: 'var(--warm-text)' }}
              />
              <button type="button" className="tq-btn tq-btn-primary" onClick={addItem}>
                <PlusIcon /> {t('shoppingList.add')}
              </button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="tq-empty-state">{t('shoppingList.empty')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderRadius: 18, background: item.purchased ? 'rgba(125, 211, 252, 0.12)' : 'var(--warm-surface)', border: '1px solid var(--warm-border)' }}>
                <button type="button" onClick={() => toggleItem(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, color: 'var(--warm-text)', cursor: 'pointer', textAlign: 'left', flex: 1 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 999, display: 'grid', placeItems: 'center', border: '1px solid var(--warm-border)', background: item.purchased ? 'var(--warm-accent)' : 'transparent', color: item.purchased ? '#fff' : 'var(--warm-text-light)' }}>
                    {item.purchased ? <CheckIcon /> : '•'}
                  </span>
                  <span style={{ textDecoration: item.purchased ? 'line-through' : 'none', color: item.purchased ? 'var(--warm-text-light)' : 'var(--warm-text)' }}>{item.text}</span>
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: item.purchased ? 'var(--warm-accent)' : 'var(--warm-text-light)' }}>{item.purchased ? t('shoppingList.itemBought') : ''}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, color: 'var(--warm-text-light)', fontSize: 13 }}>
          <div>{remaining} {t('shoppingList.remaining')}</div>
          <div>{items.length} {t('shoppingList.total')}</div>
        </div>
      </div>
    </div>
  );
}
