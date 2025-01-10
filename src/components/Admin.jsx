import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { useToast } from "./ui/use-toast";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import Upload from './Upload';

function Admin({ supabase }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchPhotos();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
    }
  };

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('votes', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fotos konnten nicht geladen werden"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, image_url) => {
    if (!window.confirm('Möchten Sie dieses Foto wirklich löschen?')) return;
    
    try {
      const fileName = image_url.split('/').pop();
      
      const { error: storageError } = await supabase
        .storage
        .from('photos')
        .remove([fileName]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: "Erfolgreich gelöscht",
        description: "Das Foto wurde erfolgreich gelöscht"
      });

      fetchPhotos();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler beim Löschen",
        description: error.message
      });
    }
  };

  const handleUpdate = async (photo) => {
    try {
      const { error } = await supabase
        .from('photos')
        .update({
          first_name: photo.first_name,
          last_name: photo.last_name,
          email: photo.email
        })
        .eq('id', photo.id);

      if (error) throw error;

      toast({
        title: "Erfolgreich aktualisiert",
        description: "Die Daten wurden erfolgreich aktualisiert"
      });

      setEditingPhoto(null);
      fetchPhotos();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fehler beim Aktualisieren",
        description: error.message
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Laden...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
          <Button onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Zurück zur Übersicht' : 'Neues Foto hochladen'}
          </Button>
          <Button variant="outline" onClick={handleLogout}>
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
              title: "Upload erfolgreich",
              description: "Das Foto wurde erfolgreich hochgeladen"
            });
          }} 
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Alle Fotos</CardTitle>
            <CardDescription>
              Verwalten Sie hier alle hochgeladenen Fotos und deren Informationen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vorschau</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
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
                        alt="Vorschau" 
                        className="w-20 h-20 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell>
                      {editingPhoto?.id === photo.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingPhoto.first_name}
                            onChange={(e) => setEditingPhoto({
                              ...editingPhoto,
                              first_name: e.target.value
                            })}
                            placeholder="Vorname"
                          />
                          <Input
                            value={editingPhoto.last_name}
                            onChange={(e) => setEditingPhoto({
                              ...editingPhoto,
                              last_name: e.target.value
                            })}
                            placeholder="Nachname"
                          />
                        </div>
                      ) : (
                        `${photo.first_name} ${photo.last_name}`
                      )}
                    </TableCell>
                    <TableCell>
                      {editingPhoto?.id === photo.id ? (
                        <Input
                          value={editingPhoto.email}
                          onChange={(e) => setEditingPhoto({
                            ...editingPhoto,
                            email: e.target.value
                          })}
                          placeholder="Email"
                        />
                      ) : (
                        photo.email
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {photo.votes} {photo.votes === 1 ? 'Stimme' : 'Stimmen'}
                    </TableCell>
                    <TableCell>
                      {new Date(photo.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="space-x-2">
                        {editingPhoto?.id === photo.id ? (
                          <>
                            <Button 
                              size="sm"
                              onClick={() => handleUpdate(editingPhoto)}
                            >
                              Speichern
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPhoto(null)}
                            >
                              Abbrechen
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPhoto({
                              ...photo,
                              // Wir kopieren nur die editierbaren Felder
                              first_name: photo.first_name,
                              last_name: photo.last_name,
                              email: photo.email
                            })}
                          >
                            Bearbeiten
                          </Button>
                        )}
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(photo.id, photo.image_url)}
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

export default Admin;