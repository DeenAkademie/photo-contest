import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";
import { Toaster } from "./ui/toaster";

function Upload({ supabase, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Überprüfe die Dateigröße (10MB Limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Datei zu groß",
          description: "Die maximale Dateigröße beträgt 10MB"
        });
        return;
      }

      // Überprüfe den Dateityp
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          variant: "destructive",
          title: "Ungültiges Dateiformat",
          description: "Bitte nur JPG, PNG oder GIF Dateien hochladen"
        });
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file || !formData.firstName.trim() || 
        !formData.lastName.trim() || !formData.email.trim()) {
      toast({
        variant: "destructive",
        title: "Fehlende Angaben",
        description: "Bitte füllen Sie alle Felder aus"
      });
      return;
    }

    // Validiere E-Mail-Format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        variant: "destructive",
        title: "Ungültige E-Mail",
        description: "Bitte geben Sie eine gültige E-Mail-Adresse ein"
      });
      return;
    }

    try {
      setUploading(true);

      // Generiere einen einzigartigen Dateinamen
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Lade das Bild in den Storage hoch
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Hole die öffentliche URL des hochgeladenen Bildes
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Speichere die Bildinformationen in der Datenbank
      const { error: dbError } = await supabase
        .from('photos')
        .insert([
          {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            email: formData.email.trim(),
            image_url: publicUrl,
            votes: 0
          }
        ]);

      if (dbError) throw dbError;

      toast({
        title: "Erfolgreich hochgeladen",
        description: "Ihr Foto wurde erfolgreich zum Wettbewerb hinzugefügt"
      });
      
      // Wenn onSuccess existiert (Admin-Bereich), rufe es auf
      if (onSuccess) {
        onSuccess();
      } else {
        // Andernfalls leite zur Galerie weiter
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload fehlgeschlagen",
        description: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Foto hochladen</CardTitle>
            <CardDescription>
              Laden Sie Ihr Foto für den Wettbewerb hoch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Vorname"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Nachname"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="ihre@email.de"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Foto</Label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg border-muted hover:border-primary transition-colors duration-300">
                  <div className="space-y-1 text-center">
                    {preview ? (
                      <div className="relative max-w-xs mx-auto">
                        <img 
                          src={preview} 
                          alt="Vorschau" 
                          className="max-h-48 rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-0 right-0 -mt-2 -mr-2"
                          onClick={() => {
                            setFile(null);
                            setPreview(null);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <FaCloudUploadAlt className="mx-auto h-12 w-12 text-muted-foreground" />
                        <div className="flex text-sm text-muted-foreground">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                          >
                            <span>Foto auswählen</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="sr-only"
                              required
                            />
                          </label>
                          <p className="pl-1">oder hierher ziehen</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, GIF bis zu 10MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <CardFooter className="flex justify-end space-x-4 px-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={uploading}
                >
                  {uploading && (
                    <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}

export default Upload;