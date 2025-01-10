import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaImages } from 'react-icons/fa';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { useToast } from "./ui/use-toast";
import { Toaster } from "./ui/toaster";
import { Progress } from "./ui/progress";
import { Dialog, DialogContent } from "./ui/dialog";

function Gallery({ supabase }) {
  const [photos, setPhotos] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedPhotoId, setVotedPhotoId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPhotos();
    checkVoteStatus();
  }, []);

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
      console.error('Error fetching photos:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Fotos konnten nicht geladen werden"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkVoteStatus = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const { ip } = await response.json();

      const { data, error } = await supabase
        .from('votes')
        .select('photo_id')
        .eq('ip_address', ip)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking vote status:', error);
      }

      setHasVoted(!!data);
      setVotedPhotoId(data?.photo_id || null);
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  };

  const handleVote = async (photoId) => {
    try {
      setUploading(true);
      const response = await fetch('https://api.ipify.org?format=json');
      const { ip } = await response.json();

      if (hasVoted) {
        if (votedPhotoId) {
          const { error: decrementError } = await supabase
            .rpc('decrement_votes', { 
              row_id: votedPhotoId 
            });

          if (decrementError) throw decrementError;
        }

        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('ip_address', ip);

        if (deleteError) throw deleteError;
      }

      const { error: voteError } = await supabase
        .from('votes')
        .insert([{ 
          photo_id: photoId, 
          ip_address: ip 
        }]);

      if (voteError) throw voteError;

      const { error: incrementError } = await supabase
        .rpc('increment_votes', { 
          row_id: photoId 
        });

      if (incrementError) throw incrementError;

      setHasVoted(true);
      setVotedPhotoId(photoId);
      await fetchPhotos();
      
      toast({
        title: hasVoted ? "Stimme geändert" : "Erfolgreich abgestimmt",
        description: hasVoted 
          ? "Ihre Stimme wurde erfolgreich geändert" 
          : "Ihre Stimme wurde erfolgreich gezählt"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ihre Stimme konnte nicht gezählt werden"
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-4">
        <Progress value={33} className="w-[60%] max-w-md" />
        <p className="text-muted-foreground">Fotos werden geladen...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="w-full min-h-[calc(100vh-64px)] flex items-center justify-center bg-background">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex flex-col items-center gap-4">
              <FaImages className="h-12 w-12 text-muted-foreground" />
              Keine Fotos vorhanden
            </CardTitle>
            <CardDescription className="text-center">
              Aktuell wurden noch keine Fotos zum Wettbewerb hochgeladen.
              Seien Sie der Erste und teilen Sie Ihr bestes Foto!
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link to="/upload">
                <svg 
                  className="mr-2 h-4 w-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 4v16m8-8H4" 
                  />
                </svg>
                Foto hochladen
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {photos.map((photo) => (
          <Card 
            key={photo.id}
            className={`overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer
              ${photo.id === votedPhotoId ? 'ring-2 ring-primary' : ''}
            `}
          >
            <div 
          className="relative aspect-square mb-4 overflow-hidden rounded-lg"
            onClick={() => setSelectedPhoto(photo)}
            >
              <img 
                src={photo.image_url} 
                alt={`Foto von ${photo.first_name} ${photo.last_name}`}
                className="w-full h-full object-cover"
                />
              {photo.id === votedPhotoId && (
                <div className="absolute top-2 right-2">
                  <Button variant="secondary" size="sm" className="pointer-events-none">
                    Ihre Wahl
                  </Button>
                </div>
              )}
            </div>
            <CardHeader>
              <CardDescription>
                von {photo.first_name} {photo.last_name}
              </CardDescription>
              <CardDescription>
                {photo.votes} {photo.votes === 1 ? 'Stimme' : 'Stimmen'}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                className="w-full"
                onClick={() => handleVote(photo.id)}
                disabled={uploading}
                variant={photo.id === votedPhotoId ? "secondary" : "default"}
              >
                {uploading && (
                  <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {uploading ? 'Wird verarbeitet...' : 
                 photo.id === votedPhotoId ? 'Ihre aktuelle Wahl' : 
                 hasVoted ? 'Stimme ändern' : 'Abstimmen'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog 
        open={!!selectedPhoto} 
        onOpenChange={() => setSelectedPhoto(null)}
        className="p-0"
      >
        <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95">
          <div 
            className="relative w-full h-full flex items-center justify-center cursor-pointer"
            onClick={() => setSelectedPhoto(null)}
          >
            {/* Bild */}
            <img 
              src={selectedPhoto?.image_url} 
              alt="Vollbild"
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()} // Verhindert, dass sich der Dialog beim Klick auf das Bild schließt
            />
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

export default Gallery;