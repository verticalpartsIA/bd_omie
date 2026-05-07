import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categorias } from "@/data/estoque-mock";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

export function ProductModal({ open, onOpenChange, onSaved }: Props) {
  const [sku, setSku] = useState("");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<string>("Polias");
  const [unidade, setUnidade] = useState("un");
  const [estMin, setEstMin] = useState("0");
  const [custo, setCusto] = useState("0");
  const [ativo, setAtivo] = useState(true);

  const submit = () => {
    if (!sku || !nome) {
      toast.error("SKU e Nome são obrigatórios");
      return;
    }
    toast.success("Produto cadastrado com sucesso");
    onSaved?.();
    onOpenChange(false);
    setSku(""); setNome(""); setEstMin("0"); setCusto("0"); setAtivo(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>SKU*</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} />
          </div>
          <div className="col-span-2">
            <Label>Nome*</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Categoria*</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidade</Label>
            <Select value={unidade} onValueChange={setUnidade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["un", "cx", "m", "kg", "L"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estoque Mínimo</Label>
            <Input type="number" value={estMin} onChange={(e) => setEstMin(e.target.value)} />
          </div>
          <div>
            <Label>Custo Unitário (R$)</Label>
            <Input type="number" value={custo} onChange={(e) => setCusto(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <Label>Produto ativo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Salvar Produto →</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}