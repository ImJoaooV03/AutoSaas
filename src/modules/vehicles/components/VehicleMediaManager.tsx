import { useState, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { UploadCloud, X, Star, Loader2, Image as ImageIcon } from "lucide-react";

interface Media {
  id?: string;
  url: string;
  is_cover: boolean;
  position: number;
}

interface VehicleMediaManagerProps {
  vehicleId: string;
  tenantId: string;
  initialMedia: Media[];
  onUpdate: () => void;
}

export function VehicleMediaManager({ vehicleId, tenantId, initialMedia, onUpdate }: VehicleMediaManagerProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    setUploading(true);
    const files = Array.from(event.target.files);
    
    try {
        // Simulating upload by creating blob URLs and inserting as mock URLs
        // In production, this would upload to Supabase Storage
        const newMedia = files.map((file, index) => ({
            tenant_id: tenantId,
            vehicle_id: vehicleId,
            url: URL.createObjectURL(file), // Blob URL for preview/demo
            is_cover: initialMedia.length === 0 && index === 0, // First image is cover if none exists
            position: initialMedia.length + index + 1
        }));

        const { error } = await supabase.from('vehicle_media').insert(newMedia);
        if (error) throw error;
        
        onUpdate();
    } catch (err: any) {
        alert("Erro ao adicionar fotos: " + err.message);
    } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (mediaId?: string, url?: string) => {
    if (!confirm("Excluir esta foto?")) return;
    
    if (mediaId) {
        await supabase.from('vehicle_media').delete().eq('id', mediaId);
    } else {
        // Fallback for optimistic UI if needed
    }
    onUpdate();
  };

  const handleSetCover = async (mediaId: string) => {
    // 1. Unset current cover
    await supabase.from('vehicle_media').update({ is_cover: false }).eq('vehicle_id', vehicleId);
    // 2. Set new cover
    await supabase.from('vehicle_media').update({ is_cover: true }).eq('id', mediaId);
    onUpdate();
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
            <h3 className="text-lg font-semibold text-slate-800">Galeria de Fotos</h3>
            <p className="text-sm text-slate-500">Arraste para reordenar ou adicione novas imagens</p>
         </div>
         <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
         >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
            Adicionar Fotos
         </button>
         <input 
            type="file" 
            multiple 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
         />
       </div>

       {initialMedia.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-slate-50">
             <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <ImageIcon size={32} />
             </div>
             <p className="text-slate-600 font-medium">Nenhuma foto adicionada</p>
             <p className="text-sm text-slate-400 mt-1">Adicione fotos para aumentar a visibilidade do anúncio</p>
          </div>
       ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
             {initialMedia.map((media) => (
                <div key={media.id || media.url} className={`group relative aspect-video bg-slate-100 rounded-lg overflow-hidden border-2 transition-all ${media.is_cover ? 'border-blue-600 shadow-md' : 'border-transparent hover:border-slate-300'}`}>
                    <img src={media.url} className="w-full h-full object-cover" />
                    
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                            onClick={() => media.id && handleSetCover(media.id)}
                            title="Definir como Capa"
                            className={`p-2 rounded-full ${media.is_cover ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-blue-50'}`}
                        >
                            <Star size={16} className={media.is_cover ? 'fill-current' : ''} />
                        </button>
                        <button 
                            onClick={() => handleDelete(media.id, media.url)}
                            title="Excluir"
                            className="p-2 rounded-full bg-white text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    {media.is_cover && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                            CAPA
                        </div>
                    )}
                </div>
             ))}
          </div>
       )}
    </div>
  );
}
