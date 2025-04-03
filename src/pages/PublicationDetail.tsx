import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Facebook, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { addLazyLoadingToImages } from '@/utils/lazyLoadImages';
import useLazyImages from '@/hooks/useLazyImages';
import { extractImagesFromHTML, preloadImagesWhenIdle } from '@/utils/imagePreloader';
import LazyImage from '@/components/ui/lazy-image';
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";

type Publication = Tables<"articles">;

const PublicationDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  
  useLazyImages(contentRef);
  
  useEffect(() => {
    const fetchPublication = async () => {
      try {
        setLoading(true);
        
        if (!slug) return;
        
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('slug', slug)
          .eq('published', true)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (data) {
          setPublication(data as Publication);
          
          if (data.content) {
            const imageUrls = extractImagesFromHTML(data.content);
            preloadImagesWhenIdle(imageUrls);
          }
        }
      } catch (error: any) {
        toast({
          title: "Klaida",
          description: "Nepavyko gauti publikacijos informacijos. Bandykite vėliau.",
          variant: "destructive"
        });
        console.error("Error fetching publication:", error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublication();
    window.scrollTo(0, 0);
  }, [slug, toast]);
  
  if (loading) {
    return (
      <>
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Kraunama...</p>
        </div>
      </>
    );
  }
  
  if (!publication) {
    return (
      <>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Publikacija nerasta</h1>
          <p className="mb-6">Atsiprašome, bet ieškoma publikacija neegzistuoja.</p>
          <Link to="/publikacijos">
            <Button className="button-primary">Grįžti į publikacijų sąrašą</Button>
          </Link>
        </div>
      </>
    );
  }
  
  const shareFacebook = () => {
    const url = `https://ponasobuolys.lt/publikacijos/${slug}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <>
      <article className="container mx-auto px-4 py-12">
        <Link to="/publikacijos" className="inline-flex items-center text-primary hover:text-primary/80 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Grįžti į publikacijų sąrašą</span>
        </Link>
        
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {publication.content_type && (
                <Badge 
                  variant={publication.content_type === 'Naujiena' ? "destructive" : "secondary"}
                >
                  {publication.content_type}
                </Badge>
              )}
              <Badge variant="outline">{publication.category}</Badge>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{publication.title}</h1>
            
            <div className="flex flex-wrap gap-4 mb-8 text-sm text-gray-600">
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                <span>{new Date(publication.date).toLocaleDateString('lt-LT')}</span>
              </div>
              <div className="flex items-center">
                <Clock className="mr-1 h-4 w-4" />
                <span>{publication.read_time} skaitymo</span>
              </div>
              <div>
                Autorius: <span className="font-medium">{publication.author}</span>
              </div>
            </div>
            
            {publication.image_url ? (
              <div className="mb-8 rounded-md overflow-hidden">
                <LazyImage 
                  src={publication.image_url} 
                  alt={publication.title} 
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 mb-8">
                Publikacijos nuotrauka
              </div>
            )}
            
            <div 
              ref={contentRef}
              className="prose max-w-none mb-8" 
              dangerouslySetInnerHTML={{ __html: addLazyLoadingToImages(publication.content || '') }}
            />
            
            <div className="border-t border-gray-200 pt-6 mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="font-medium">Dalintis publikacija:</p>
                <Button 
                  onClick={shareFacebook} 
                  className="bg-[#1877F2] text-white hover:bg-[#1877F2]/90"
                >
                  <Facebook className="mr-2 h-4 w-4" />
                  <span>Dalintis Facebook</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </>
  );
};

export default PublicationDetail;
