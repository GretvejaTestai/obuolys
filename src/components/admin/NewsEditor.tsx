import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import RichTextEditor from './RichTextEditor';
import { supabase } from '@/integrations/supabase/client';
import { FileUpload } from '@/components/ui/file-upload';
import LazyImage from '@/components/ui/lazy-image';

interface NewsEditorProps {
  id: string | null;
  onCancel: () => void;
  onSave: () => void;
}

const NewsEditor = ({ id, onCancel, onSave }: NewsEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(id !== null);
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  
  const form = useForm({
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      author: '',
      date: new Date().toISOString().split('T')[0],
      published: false,
      image_url: '',
    }
  });

  useEffect(() => {
    const fetchNews = async () => {
      if (!id || id === 'new') return;
      
      try {
        const { data, error } = await supabase
          .from('news')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          form.reset({
            title: data.title,
            slug: data.slug,
            description: data.description,
            author: data.author,
            date: new Date(data.date).toISOString().split('T')[0],
            published: data.published,
            image_url: data.image_url || '',
          });
          setContent(data.content);
          setImageUrl(data.image_url || null);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        toast({
          title: "Klaida",
          description: "Nepavyko gauti naujienos duomenų.",
          variant: "destructive",
        });
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchNews();
  }, [id, form, toast]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const onTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const title = event.target.value;
    form.setValue('title', title);
    
    // Only auto-generate slug if it's empty or if this is a new news item
    if (!form.getValues('slug') || id === null) {
      form.setValue('slug', generateSlug(title));
    }
  };

  const handleImageUpload = (url: string) => {
    console.log("NewsEditor handleImageUpload gavo URL:", url);
    setImageUrl(url);
    
    // Eksplicitiškai nustatyti form.setValue su gautu URL
    if (url) {
      form.setValue('image_url', url, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      console.log("Nustatytas image_url formoje:", form.getValues('image_url'));
    }
  };

  const onSubmit = async (values: any) => {
    if (!content.trim()) {
      toast({
        title: "Klaida",
        description: "Įveskite naujienos turinį.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const newsData = {
        ...values,
        content,
        image_url: imageUrl,
      };
      
      console.log("Siunčiami naujienos duomenys:", newsData);
      
      let response;
      
      if (id && id !== 'new') {
        // Update existing news
        response = await supabase
          .from('news')
          .update(newsData)
          .eq('id', id);
      } else {
        // Create new news
        response = await supabase
          .from('news')
          .insert([newsData]);
      }
      
      if (response.error) throw response.error;
      
      toast({
        title: "Sėkmingai išsaugota",
        description: id ? "Naujiena atnaujinta." : "Nauja naujiena sukurta.",
      });
      
      onSave();
    } catch (error) {
      console.error('Error saving news:', error);
      toast({
        title: "Klaida",
        description: "Nepavyko išsaugoti naujienos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Naujienos redagavimas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4">Kraunami duomenys...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{id ? 'Redaguoti naujieną' : 'Nauja naujiena'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pavadinimas</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Naujienos pavadinimas" 
                        {...field}
                        onChange={onTitleChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL identifikatorius (slug)</FormLabel>
                    <FormControl>
                      <Input placeholder="naujienos-pavadinimas" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unikalus identifikatorius naudojamas URL adrese
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aprašymas</FormLabel>
                  <FormControl>
                    <Input placeholder="Trumpas naujienos aprašymas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Autorius</FormLabel>
                    <FormControl>
                      <Input placeholder="Naujienos autorius" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publikavimo data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium mb-4">Naujienos viršelio nuotrauka</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormLabel>Įkelti naują nuotrauką</FormLabel>
                  <FileUpload
                    bucket="site-images"
                    folder="news/covers"
                    acceptedFileTypes="image/jpeg,image/png,image/webp"
                    maxSizeMB={2}
                    onUploadComplete={handleImageUpload}
                  />
                  <FormDescription>
                    Rekomenduojamas dydis: 1200 x 800 pikselių. Maksimalus dydis: 2MB
                  </FormDescription>
                </div>
                <div>
                  {imageUrl ? (
                    <div className="space-y-2">
                      <FormLabel>Esama nuotrauka</FormLabel>
                      <div className="border rounded-md overflow-hidden aspect-video">
                        <LazyImage
                          src={imageUrl}
                          alt="Naujienos nuotrauka"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setImageUrl(null);
                          form.setValue('image_url', '');
                        }}
                      >
                        Pašalinti nuotrauką
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-md p-4 h-full flex items-center justify-center bg-muted">
                      <p className="text-muted-foreground text-center">
                        Nuotrauka nepasirinkta
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium mb-4">Naujienos turinys</h3>
              <RichTextEditor 
                value={content} 
                onChange={setContent} 
                placeholder="Įveskite naujienos turinį..." 
              />
            </div>

            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Publikuota
                    </FormLabel>
                    <FormDescription>
                      Matoma viešai
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Atšaukti
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saugoma...' : 'Išsaugoti'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NewsEditor;
