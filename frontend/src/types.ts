export interface ComponentItem {
  id: string;
  name: string;
  title: string;
  description: string;
  registry: string;
  homepage: string;
  type: string;
  install_url: string;
  install_cmd: string;
  doc_url: string;
  install_status: number;
  doc_status: number;
  is_installable: boolean;
}

export interface RegistryMeta {
  name: string;
  homepage: string;
  method: string;
  components_count: number;
}

export interface CatalogMetadata {
  total_components: number;
  total_registries: number;
  registries: Record<string, RegistryMeta>;
  types: string[];
}
