import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { useToast } from './ui/use-toast';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import Upload from './Upload';
import PropTypes from 'prop-types';

function Admin({ supabase }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('votes', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Fotos konnten nicht geladen werden',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDelete = async (id, image_url) => {
    if (!window.confirm('Möchten Sie dieses Foto wirklich löschen?')) return;

    try {
      const fileName = image_url.split('/').pop();

      const { error: storageError } = await supabase.storage
        .from('photos')
        .remove([fileName]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: 'Erfolgreich gelöscht',
        description: 'Das Foto wurde erfolgreich gelöscht',
      });

      fetchPhotos();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Löschen',
        description: error.message,
      });
    }
  };

  const handleUpdate = async (photo) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({
          account_name: photo.account_name,
        })
        .eq('id', photo.id);

      if (error) throw error;

      toast({
        title: 'Erfolgreich aktualisiert',
        description: 'Die Daten wurden erfolgreich aktualisiert',
      });

      setEditingPhoto(null);
      fetchPhotos();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Fehler beim Aktualisieren',
        description: error.message,
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Laden...
      </div>
    );
  }

  return (
    <div className='container mx-auto py-8'>
      <div className='flex justify-between items-center mb-8'>
        <h1 className='text-3xl font-bold'>Admin Dashboard</h1>
        <div className='space-x-4'>
          <Button onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Zurück zur Übersicht' : 'Neues Foto hochladen'}
          </Button>
          <Button variant='outline' onClick={handleLogout}>
            Abmelden
          </Button>
        </div>
      </div>

      {showUpload ? (
        <Upload
          supabase={supabase}
          onSuccess={() => {
            setShowUpload(false);
            fetchPhotos();
            toast({
              title: 'Upload erfolgreich',
              description: 'Das Foto wurde erfolgreich hochgeladen',
            });
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Alle Fotos</CardTitle>
            <CardDescription>
              Verwalten Sie hier alle hochgeladenen Fotos und deren
              Informationen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vorschau</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Stimmen</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {photos.map((photo) => (
                  <TableRow key={photo.id}>
                    <TableCell>
                      <img
                        src={photo.image_url}
                        alt='Vorschau'
                        className='w-20 h-20 object-cover rounded'
                      />
                    </TableCell>
                    <TableCell>
                      {editingPhoto?.id === photo.id ? (
                        <Input
                          value={editingPhoto.account_name}
                          onChange={(e) =>
                            setEditingPhoto({
                              ...editingPhoto,
                              account_name: e.target.value,
                            })
                          }
                          placeholder='Account Name'
                        />
                      ) : (
                        photo.account_name
                      )}
                    </TableCell>
                    <TableCell className='font-medium'>
                      {photo.votes} {photo.votes === 1 ? 'Stimme' : 'Stimmen'}
                    </TableCell>
                    <TableCell>
                      {new Date(photo.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className='space-x-2'>
                        {editingPhoto?.id === photo.id ? (
                          <>
                            <Button
                              size='sm'
                              onClick={() => handleUpdate(editingPhoto)}
                            >
                              Speichern
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => setEditingPhoto(null)}
                            >
                              Abbrechen
                            </Button>
                          </>
                        ) : (
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() =>
                              setEditingPhoto({
                                ...photo,
                                account_name: photo.account_name,
                              })
                            }
                          >
                            Bearbeiten
                          </Button>
                        )}
                        <Button
                          variant='destructive'
                          size='sm'
                          onClick={() =>
                            handleDelete(photo.id, photo.image_url)
                          }
                        >
                          Löschen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

Admin.propTypes = {
  supabase: PropTypes.shape({
    auth: PropTypes.shape({
      getSession: PropTypes.func.isRequired,
      signOut: PropTypes.func.isRequired,
    }).isRequired,
    storage: PropTypes.shape({
      from: PropTypes.func.isRequired,
    }).isRequired,
    from: PropTypes.func.isRequired,
  }).isRequired,
};

export default Admin;
