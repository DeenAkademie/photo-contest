import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FaImages } from 'react-icons/fa';
import { Button } from './ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from './ui/card';
import { useToast } from './ui/use-toast';
import { Toaster } from './ui/toaster';
import { Progress } from './ui/progress';
import { Dialog, DialogContent } from './ui/dialog';
import PropTypes from 'prop-types';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

function Gallery({ supabase }) {
  const [photos, setPhotos] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedPhotoId, setVotedPhotoId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { toast } = useToast();

  const fetchPhotos = useCallback(async () => {
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
        variant: 'destructive',
        title: 'Fehler',
        description: 'Fotos konnten nicht geladen werden',
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  const getVisitorId = useCallback(async () => {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  }, []);

  const checkVoteStatus = useCallback(async () => {
    try {
      const visitorId = await getVisitorId();

      const { data, error } = await supabase
        .from('votes')
        .select('photo_id')
        .eq('visitor_id', visitorId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking vote status:', error);
      }

      setHasVoted(!!data);
      setVotedPhotoId(data?.photo_id || null);
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  }, [supabase, getVisitorId]);

  useEffect(() => {
    checkVoteStatus();
    fetchPhotos();
  }, [checkVoteStatus, fetchPhotos]);

  const handleVote = async (photoId) => {
    try {
      setUploading(true);
      const visitorId = await getVisitorId();

      if (hasVoted) {
        if (votedPhotoId) {
          const { error: decrementError } = await supabase.rpc(
            'decrement_votes',
            {
              row_id: votedPhotoId,
            }
          );

          if (decrementError) throw decrementError;
        }

        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('visitor_id', visitorId);

        if (deleteError) throw deleteError;
      }

      const { error: voteError } = await supabase.from('votes').insert([
        {
          photo_id: photoId,
          visitor_id: visitorId,
        },
      ]);

      if (voteError) throw voteError;

      const { error: incrementError } = await supabase.rpc('increment_votes', {
        row_id: photoId,
      });

      if (incrementError) throw incrementError;

      setHasVoted(true);
      setVotedPhotoId(photoId);
      await fetchPhotos();

      toast({
        title: hasVoted ? 'Stimme geändert' : 'Erfolgreich abgestimmt',
        description: hasVoted
          ? 'Ihre Stimme wurde erfolgreich geändert'
          : 'Ihre Stimme wurde erfolgreich gezählt',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Ihre Stimme konnte nicht gezählt werden',
      });
    } finally {
      setUploading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleDeletePhoto = async (photoId) => {
    try {
      // First delete related votes
      const { error: votesError } = await supabase
        .from('votes')
        .delete()
        .eq('photo_id', photoId);

      if (votesError) throw votesError;

      // Then delete the photo
      const { error: photoError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (photoError) throw photoError;

      // Refresh the photos list
      await fetchPhotos();

      toast({
        title: 'Erfolgreich gelöscht',
        description: 'Das Foto wurde erfolgreich gelöscht',
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Das Foto konnte nicht gelöscht werden',
      });
    }
  };

  // Sortiere die Einträge nach Abstimmungszeitpunkt
  const sortedEntries = photos.sort((a, b) => {
    // Wenn ein Eintrag eine Abstimmung hat, kommt er nach vorne
    if (a.votes && !b.votes) return -1;
    if (!a.votes && b.votes) return 1;

    // Bei gleicher Abstimmungssituation nach Datum sortieren
    return b.timestamp - a.timestamp;
  });

  if (loading) {
    return (
      <div className='w-full h-screen flex flex-col items-center justify-center gap-4'>
        <Progress value={33} className='w-[60%] max-w-md' />
        <p className='text-muted-foreground'>Fotos werden geladen...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className='w-full min-h-[calc(100vh-64px)] flex items-center justify-center bg-background'>
        <Card className='max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='flex flex-col items-center gap-4'>
              <FaImages className='h-12 w-12 text-muted-foreground' />
              Keine Fotos vorhanden
            </CardTitle>
            <CardDescription className='text-center'>
              Aktuell wurden noch keine Fotos zum Wettbewerb hochgeladen. Seien
              Sie der Erste und teilen Sie Ihr bestes Foto!
            </CardDescription>
          </CardHeader>
          <CardFooter className='flex justify-center'>
            <Button asChild>
              <Link to='/upload'>
                <svg
                  className='mr-2 h-4 w-4'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 4v16m8-8H4'
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
    <div className='w-full p-4 md:p-6 lg:p-8'>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
        {sortedEntries.map((photo) => (
          <Card
            key={photo.id}
            className={`overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer
              ${photo.id === votedPhotoId ? 'ring-2 ring-primary' : ''}
            `}
          >
            <div
              className='relative aspect-square mb-2 overflow-hidden rounded-lg'
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.image_url}
                alt={`Foto von ${photo.account_name}`}
                className='w-full h-full object-cover'
              />
              {photo.id === votedPhotoId && (
                <div className='absolute top-1 right-1'>
                  <Button
                    variant='secondary'
                    size='sm'
                    className='pointer-events-none text-xs py-1 h-7'
                  >
                    Ihre Wahl
                  </Button>
                </div>
              )}
            </div>
            <CardHeader className='p-3 space-y-1'>
              <CardDescription className='text-sm'>
                von {photo.account_name}
              </CardDescription>
              <CardDescription className='text-sm'>
                {photo.votes} {photo.votes === 1 ? 'Stimme' : 'Stimmen'}
              </CardDescription>
            </CardHeader>
            <CardFooter className='p-3 pt-0'>
              <Button
                className='w-full h-8 text-sm'
                onClick={() => handleVote(photo.id)}
                disabled={uploading}
                variant={photo.id === votedPhotoId ? 'secondary' : 'default'}
              >
                {uploading && (
                  <svg
                    className='mr-2 h-3 w-3 animate-spin'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    />
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    />
                  </svg>
                )}
                {uploading
                  ? 'Wird verarbeitet...'
                  : photo.id === votedPhotoId
                  ? 'Ihre aktuelle Wahl'
                  : hasVoted
                  ? 'Stimme ändern'
                  : 'Abstimmen'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!selectedPhoto}
        onOpenChange={() => setSelectedPhoto(null)}
        className='p-0'
      >
        <DialogContent className='max-w-none w-screen h-screen p-0 bg-background/80 backdrop-blur-md duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'>
          <div
            className='relative w-full h-full flex items-center justify-center cursor-pointer'
            onClick={() => setSelectedPhoto(null)}
          >
            <img
              src={selectedPhoto?.image_url}
              alt='Vollbild'
              className='max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform duration-300 hover:scale-[1.02]'
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant='outline'
              size='icon'
              className='absolute top-4 right-4 rounded-full'
              onClick={() => setSelectedPhoto(null)}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-4 w-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}

Gallery.propTypes = {
  supabase: PropTypes.shape({
    from: PropTypes.func.isRequired,
    rpc: PropTypes.func.isRequired,
  }).isRequired,
};

export default Gallery;
