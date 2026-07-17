import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { Sidebar } from '../components/Sidebar';
import { PageHeader } from '../components/ui/PageHeader';
import { PageContainer } from '../components/ui/PageContainer';
import { SectionCard } from '../components/ui/SectionCard';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusChip } from '../components/ui/StatusChip';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api } from '../services/api';

type PackageItem = {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
  description: string;
  status: string;
};

export function Packages() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    price: '',
    durationMonths: '',
    description: '',
  });

  async function loadPackages() {
    const response = await api.get('/packages');
    setPackages(response.data);
  }

  useEffect(() => {
    loadPackages();
  }, []);

  const resetForm = () => {
    setForm({
      name: '',
      price: '',
      durationMonths: '',
      description: '',
    });
    setEditingPackage(null);
    setOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setOpen(true);
  };

  const handleOpenEdit = (item: PackageItem) => {
    setEditingPackage(item);
    setForm({
      name: item.name,
      price: String(item.price),
      durationMonths: String(item.durationMonths),
      description: item.description || '',
    });
    setOpen(true);
  };

  const handleSavePackage = async () => {
    const payload = {
      name: form.name,
      price: Number(form.price),
      durationMonths: Number(form.durationMonths),
      description: form.description,
      status: 'Aktif',
    };

    if (editingPackage) {
      await api.put(`/packages/${editingPackage.id}`, payload);
    } else {
      await api.post('/packages', payload);
    }

    resetForm();
    await loadPackages();
  };

  const handleDeletePackage = async () => {
    if (!deleteId) return;

    await api.delete(`/packages/${deleteId}`);
    setDeleteId(null);
    await loadPackages();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      <Sidebar />

      <PageContainer>
        <PageHeader
          eyebrow="NOVAPLUS+"
          title="Paketler"
          subtitle="Spor salonu üyelik paketlerini buradan yönetin."
          icon={<Inventory2RoundedIcon />}
          actions={
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenAdd}
            >
              Yeni Paket
            </Button>
          }
        />

        <SectionCard
          title="Paket Listesi"
          subtitle={`${packages.length} paket görüntüleniyor`}
        >
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ background: '#f8fafc' }}>
                  <TableCell>Paket Adı</TableCell>
                  <TableCell>Süre</TableCell>
                  <TableCell>Fiyat</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {packages.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {item.name}
                    </TableCell>
                    <TableCell>{item.durationMonths} Ay</TableCell>
                    <TableCell>
                      ₺{Number(item.price).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell>
                      <StatusChip
                        label={item.status || 'Aktif'}
                        tone={item.status === 'Pasif' ? 'neutral' : 'success'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <EditIcon />
                      </IconButton>

                      <IconButton
                        color="error"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

                {packages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState
                        icon={<Inventory2RoundedIcon />}
                        title="Kayıtlı paket bulunamadı"
                        description="Yeni paket ekleyerek başlayabilirsiniz."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </SectionCard>
      </PageContainer>

      <Dialog open={open} onClose={resetForm} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingPackage ? 'Paket Düzenle' : 'Yeni Paket Ekle'}
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Paket Adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <TextField
            label="Fiyat"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />

          <TextField
            label="Süre (Ay)"
            type="number"
            value={form.durationMonths}
            onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
          />

          <TextField
            label="Açıklama"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={resetForm}>İptal</Button>
          <Button variant="contained" onClick={handleSavePackage}>
            {editingPackage ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Paketi sil"
        description="Bu paketi silmek istediğinize emin misiniz?"
        confirmLabel="Sil"
        destructive
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDeletePackage()}
      />
    </Box>
  );
}