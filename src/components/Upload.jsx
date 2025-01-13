import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import { Toaster } from './ui/toaster';
import { Progress } from './ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';

function Upload({ supabase }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const accountName = formData.get('accountName');
    const photo = formData.get('photo');

    if (!accountName || !photo) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte füllen Sie alle Felder aus',
      });
      return;
    }

    try {
      setUploading(true);

      const fileExt = photo.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, photo, {
          onUploadProgress: (progress) => {
            setProgress(Math.round((progress.loaded / progress.total) * 100));
          },
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('photos').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('photos').insert([
        {
          account_name: accountName,
          image_url: publicUrl,
          votes: 0,
        },
      ]);

      if (dbError) throw dbError;

      toast({
        title: 'Erfolgreich hochgeladen',
        description: 'Ihr Foto wurde erfolgreich hochgeladen',
      });

      navigate('/');
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Foto konnte nicht hochgeladen werden',
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className='container max-w-xl mx-auto p-4'>
      <form onSubmit={handleSubmit} className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle>Foto hochladen</CardTitle>
            <CardDescription>
              Laden ein Foto für den Wettbewerb hoch.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-2'>
              <Label htmlFor='accountName'>Profilname</Label>
              <Input
                id='accountName'
                name='accountName'
                type='text'
                required
                disabled={uploading}
                placeholder='Profilname des Bildbesitzers'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='photo'>Foto</Label>
              <div className='grid w-full items-center gap-4'>
                <div className='flex flex-col items-center justify-center space-y-4 p-6 border-2 border-dashed rounded-lg'>
                  {preview ? (
                    <div className='space-y-4 w-full'>
                      <img
                        src={preview}
                        alt='Vorschau'
                        className='mx-auto max-h-64 object-contain'
                      />
                      <p className='text-sm text-center text-muted-foreground'>
                        Klicken Sie unten, um ein anderes Foto auszuwählen
                      </p>
                    </div>
                  ) : (
                    <div className='flex flex-col items-center space-y-4'>
                      <svg
                        className='h-12 w-12 text-muted-foreground'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                        />
                      </svg>
                      <p className='text-muted-foreground'>
                        Wählen Sie ein Foto aus
                      </p>
                    </div>
                  )}
                  <Input
                    id='photo'
                    name='photo'
                    type='file'
                    accept='image/*'
                    required
                    disabled={uploading}
                    onChange={handleFileChange}
                    className='max-w-xs'
                  />
                </div>
              </div>
            </div>

            {uploading && (
              <div className='space-y-2'>
                <Progress value={progress} className='w-full' />
                <p className='text-sm text-muted-foreground text-center'>
                  {progress}% hochgeladen...
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type='submit'
              className='w-full'
              disabled={uploading || !preview}
            >
              {uploading ? 'Wird hochgeladen...' : 'Foto hochladen'}
            </Button>
          </CardFooter>
        </Card>
      </form>
      <Toaster />
    </div>
  );
}

Upload.propTypes = {
  supabase: PropTypes.shape({
    storage: PropTypes.object.isRequired,
    from: PropTypes.func.isRequired,
  }).isRequired,
};

export default Upload;
