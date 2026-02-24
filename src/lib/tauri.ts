import { invoke } from "@tauri-apps/api/core";
import type {
  PokemonSummary,
  PokemonDetail,
  PokemonAbility,
  PokemonMoveEntry,
  EvolutionNode,
  MoveSummary,
  MoveDetail,
  ItemSummary,
  TypeEntry,
  TypeEfficacy,
  SyncStatus,
  AppSettings,
} from "@/types";

// Settings
export const getSettings = () => invoke<AppSettings>("get_settings");
export const setSetting = (key: string, value: string) =>
  invoke<void>("set_setting", { key, value });

// Sync
export const startSync = () => invoke<void>("start_sync");
export const getSyncStatus = () => invoke<SyncStatus>("get_sync_status");
export const cancelSync = () => invoke<void>("cancel_sync");
export const clearCache = () => invoke<void>("clear_cache");

// Pokemon
export const getAllPokemon = () => invoke<PokemonSummary[]>("get_all_pokemon");
export const getPokemonById = (id: number) =>
  invoke<PokemonDetail | null>("get_pokemon_by_id", { id });
export const searchPokemon = (query: string) =>
  invoke<PokemonSummary[]>("search_pokemon", { query });
export const getPokemonAbilities = (pokemonId: number) =>
  invoke<PokemonAbility[]>("get_pokemon_abilities", { pokemonId });
export const getPokemonEvolutionChain = (pokemonId: number) =>
  invoke<EvolutionNode | null>("get_pokemon_evolution_chain", { pokemonId });

// Moves
export const getAllMoves = () => invoke<MoveSummary[]>("get_all_moves");
export const getMoveById = (id: number) =>
  invoke<MoveDetail | null>("get_move_by_id", { id });
export const searchMoves = (query: string) =>
  invoke<MoveSummary[]>("search_moves", { query });
export const getPokemonMoves = (pokemonId: number) =>
  invoke<PokemonMoveEntry[]>("get_pokemon_moves", { pokemonId });

// Items
export const getAllItems = () => invoke<ItemSummary[]>("get_all_items");
export const searchItems = (query: string) =>
  invoke<ItemSummary[]>("search_items", { query });

// Types
export const getAllTypes = () => invoke<TypeEntry[]>("get_all_types");
export const getTypeEfficacy = () => invoke<TypeEfficacy[]>("get_type_efficacy");

// Favorites
export const toggleFavorite = (pokemonId: number) =>
  invoke<boolean>("toggle_favorite", { pokemonId });
export const getFavorites = () => invoke<number[]>("get_favorites");
