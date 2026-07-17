import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Snackbar, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import {
  CreditCardRounded, QrCode2Rounded, SearchRounded, SellRounded,
} from '@mui/icons-material';
import { api } from '../services/api';
import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { SectionCard } from '../components/ui/SectionCard';

type CredentialStatus = 'AVAILABLE' | 'ASSIGNED' | 'PASSIVE' | 'LOST' | 'CANCELLED';

type Member = {
  id: number;
  name?: string;
  fullName?: string;
  phone?: string;
};

type AccessItem = {
  id: string;
  type: 'CARD' | 'QR';
  code: string;
  memberId: number | null;
  member?: Member | null;
  status: CredentialStatus;
  retailUnitPrice?: number | string | null;
  salePrice?: number | string | null;
  soldAt?: string | null;
  assignedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type Summary = {
  cards: { total: number; available: number; assigned: number };
  qr: { total: number; available: number; assigned: number };
};

const memberName = (member?: Member | null) =>
  member?.fullName || member?.name || (member ? `Üye #${member.id}` : 'Üye bilgisi yok');

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR')).join('');

const errorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string | string[] } } })
      .response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'İşlem sırasında hata oluştu.';
};

const formatMoney = (value?: number | string | null) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY',
  }).format(amount);
};

const saleDate = (item: AccessItem) => {
  const value = item.soldAt || item.assignedAt || item.updatedAt || item.createdAt;
  return value ? new Date(value).toLocaleString('tr-TR') : '—';
};

export function AccessCards() {
  const [items, setItems] = useState<AccessItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState<Summary>({
    cards: { total: 0, available: 0, assigned: 0 },
    qr: { total: 0, available: 0, assigned: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [cardId, setCardId] = useState('');
  const [qrId, setQrId] = useState('');
  const [cardPrice, setCardPrice] = useState('');
  const [qrPrice, setQrPrice] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CARD' | 'QR'>('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsResponse, summaryResponse, membersResponse] = await Promise.all([
        api.get<AccessItem[]>('/access-cards'),
        api.get<Summary>('/access-cards/summary'),
        api.get<Member[]>('/members'),
      ]);
      const itemsData = Array.isArray(itemsResponse.data)
        ? itemsResponse.data
        : [];

      const extractArray = <T,>(
        payload: unknown,
        preferredKeys: string[],
        depth = 0,
      ): T[] => {
        if (Array.isArray(payload)) {
          return payload as T[];
        }

        if (
          !payload ||
          typeof payload !== 'object' ||
          depth > 4
        ) {
          return [];
        }

        const record = payload as Record<string, unknown>;

        for (const key of preferredKeys) {
          if (Array.isArray(record[key])) {
            return record[key] as T[];
          }
        }

        for (const key of preferredKeys) {
          const nested = extractArray<T>(
            record[key],
            preferredKeys,
            depth + 1,
          );

          if (nested.length > 0) {
            return nested;
          }
        }

        return [];
      };

      const membersData = extractArray<Member>(
        membersResponse.data,
        ['members', 'data', 'items', 'results', 'rows'],
      );

      setItems(itemsData);
      setSummary(summaryResponse.data);
      setMembers(membersData);
    } catch (error) {
      setMessageType('error');
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const availableCards = useMemo(() =>
    items.filter((item) => item.type === 'CARD' && item.status === 'AVAILABLE'), [items]);
  const availableQr = useMemo(() =>
    items.filter((item) => item.type === 'QR' && item.status === 'AVAILABLE'), [items]);

  const assignedItems = useMemo(() => {
    const text = search.trim().toLocaleLowerCase('tr-TR');
    return items.filter((item) => item.status === 'ASSIGNED').filter((item) => {
      const typeOk = typeFilter === 'ALL' || item.type === typeFilter;
      const searchOk = !text || item.code.toLocaleLowerCase('tr-TR').includes(text) ||
        memberName(item.member).toLocaleLowerCase('tr-TR').includes(text) ||
        (item.member?.phone || '').includes(text);
      return typeOk && searchOk;
    });
  }, [items, search, typeFilter]);

  const openSale = () => {
    setMemberId(''); setCardId(''); setQrId('');
    setCardPrice(''); setQrPrice(''); setDescription('');
    setDialogOpen(true);
  };

  const total = (cardId ? Number(cardPrice || 0) : 0) +
    (qrId ? Number(qrPrice || 0) : 0);

  const completeSale = async () => {
    if (!memberId) return void (setMessageType('error'), setMessage('Lütfen bir üye seçin.'));
    if (!cardId && !qrId) return void (setMessageType('error'), setMessage('Kart veya QR seçmelisiniz.'));
    if (cardId && Number(cardPrice) <= 0) return void (setMessageType('error'), setMessage('Kart satış fiyatını girin.'));
    if (qrId && Number(qrPrice) <= 0) return void (setMessageType('error'), setMessage('QR satış fiyatını girin.'));

    try {
      setSaving(true);
      await api.post('/access-cards/sell', {
        memberId: Number(memberId),
        cardId: cardId || undefined,
        qrId: qrId || undefined,
        cardPrice: cardId ? Number(cardPrice) : undefined,
        qrPrice: qrId ? Number(qrPrice) : undefined,
        description: description.trim() || undefined,
      });
      setDialogOpen(false);
      setMessageType('success');
      setMessage('Satış tamamlandı ve finans gelirine eklendi.');
      await loadData();
    } catch (error) {
      setMessageType('error');
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    ['Boş Kart', summary.cards.available, `${summary.cards.total} toplam kart`, <CreditCardRounded />, '#eff6ff', '#2563eb'],
    ['Satılan Kart', summary.cards.assigned, 'Üyelere tanımlı', <CreditCardRounded />, '#f0fdf4', '#16a34a'],
    ['Boş QR', summary.qr.available, `${summary.qr.total} toplam QR`, <QrCode2Rounded />, '#faf5ff', '#9333ea'],
    ['Satılan QR', summary.qr.assigned, 'Üyelere tanımlı', <QrCode2Rounded />, '#fff7ed', '#ea580c'],
  ] as const;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f7fb' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="Kart & QR Merkezi"
          subtitle="Stokları takip edin, satış yapın ve her kartın veya QR'ın hangi üyede olduğunu görün."
          icon={<CreditCardRounded />}
          actions={
            <Button
              variant="contained"
              startIcon={<SellRounded />}
              onClick={openSale}
              sx={{
                px: 2.5,
                py: 1.1,
                fontWeight: 800,
              }}
            >
              Yeni Satış
            </Button>
          }
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          {statCards.map(([title, value, subtitle, icon, background, color]) => (
            <StatCard
              key={title}
              title={title}
              value={value}
              subtitle={subtitle}
              icon={icon}
              accent={color}
              iconBackground={background}
            />
          ))}
        </Box>

        <SectionCard
          title="Satılan Kart ve QR'lar"
          subtitle="Kime satıldığı, kodu, satış fiyatı ve tarihi."
          actions={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField size="small" placeholder="Üye, telefon veya kod ara..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> } }}
                sx={{ width: { xs: '100%', sm: 290 } }} />
              <TextField select size="small" label="Tür" value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'CARD' | 'QR')}
                sx={{ width: { xs: '100%', sm: 130 } }}>
                <MenuItem value="ALL">Tümü</MenuItem><MenuItem value="CARD">Kart</MenuItem><MenuItem value="QR">QR</MenuItem>
              </TextField>
            </Stack>
          }
        >
          {loading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
          ) : assignedItems.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Satış kaydı bulunamadı</Typography>
              <Typography sx={{ mt: 0.5, color: '#64748b' }}>Arama filtresini değiştirin veya yeni bir satış oluşturun.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead><TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell>Tür</TableCell><TableCell>Kod</TableCell><TableCell>Satın Alan Üye</TableCell>
                  <TableCell>Telefon</TableCell><TableCell>Satış Fiyatı</TableCell><TableCell>Satış Tarihi</TableCell><TableCell>Durum</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {assignedItems.map((item) => {
                    const name = memberName(item.member);
                    return (
                      <TableRow key={item.id} hover>
                        <TableCell><Chip size="small"
                          icon={item.type === 'CARD' ? <CreditCardRounded /> : <QrCode2Rounded />}
                          label={item.type === 'CARD' ? 'Kart' : 'QR'}
                          color={item.type === 'CARD' ? 'primary' : 'secondary'} variant="outlined" /></TableCell>
                        <TableCell><Typography component="code" sx={{ px: 1.25, py: 0.75, borderRadius: 2, backgroundColor: '#f1f5f9', fontWeight: 800 }}>{item.code}</Typography></TableCell>
                        <TableCell><Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                          <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 800, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{initials(name)}</Avatar>
                          <Box><Typography sx={{ fontWeight: 800 }}>{name}</Typography><Typography sx={{ color: '#94a3b8', fontSize: 12 }}>Üye #{item.memberId || '—'}</Typography></Box>
                        </Stack></TableCell>
                        <TableCell>{item.member?.phone || '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#16a34a' }}>{formatMoney(item.salePrice ?? item.retailUnitPrice)}</TableCell>
                        <TableCell>{saleDate(item)}</TableCell>
                        <TableCell><Chip size="small" color="success" label="Satıldı" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

        </SectionCard>

        <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontWeight: 900 }}>Yeni Kart / QR Satışı</DialogTitle>
          <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth><InputLabel id="sale-member">Üye</InputLabel>
              <Select labelId="sale-member" label="Üye" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                {members.length === 0 ? (
                  <MenuItem disabled value="">
                    Üye listesi yüklenemedi veya kayıtlı üye yok
                  </MenuItem>
                ) : (
                  members.map((member) => (
                    <MenuItem
                      key={member.id}
                      value={String(member.id)}
                    >
                      {memberName(member)}
                      {member.phone ? ` · ${member.phone}` : ''}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth><InputLabel id="sale-card">Fiziksel Kart</InputLabel>
              <Select labelId="sale-card" label="Fiziksel Kart" value={cardId}
                onChange={(e) => { setCardId(e.target.value); setCardPrice(''); }}>
                <MenuItem value="">Kart seçme</MenuItem>
                {availableCards.map((item) => <MenuItem key={item.id} value={item.id}>{item.code}</MenuItem>)}
              </Select>
            </FormControl>
            {cardId && <TextField fullWidth type="number" label="Kart Satış Fiyatı" value={cardPrice}
              onChange={(e) => setCardPrice(e.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />}
            <FormControl fullWidth><InputLabel id="sale-qr">QR</InputLabel>
              <Select labelId="sale-qr" label="QR" value={qrId}
                onChange={(e) => { setQrId(e.target.value); setQrPrice(''); }}>
                <MenuItem value="">QR seçme</MenuItem>
                {availableQr.map((item) => <MenuItem key={item.id} value={item.id}>{item.code}</MenuItem>)}
              </Select>
            </FormControl>
            {qrId && <TextField fullWidth type="number" label="QR Satış Fiyatı" value={qrPrice}
              onChange={(e) => setQrPrice(e.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />}
            <TextField fullWidth multiline minRows={2} label="Finans Açıklaması" value={description}
              onChange={(e) => setDescription(e.target.value)} />
            <Alert severity="info">Toplam satış: <strong>{total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</strong><br />Bu tutar Finans bölümüne gelir olarak eklenecek.</Alert>
          </Stack></DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>Vazgeç</Button>
            <Button variant="contained" onClick={() => void completeSale()} disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SellRounded />}>
              {saving ? 'Kaydediliyor' : 'Satışı Tamamla'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage('')}>
          <Alert variant="filled" severity={messageType} onClose={() => setMessage('')}>{message}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
