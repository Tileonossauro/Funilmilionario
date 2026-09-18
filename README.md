# GD Funnel Builder

Ferramenta visual para criar, organizar, apresentar e analisar funis de aquisição, vendas,
ativação e retenção — com um agente Claude operando como camada de inteligência sobre o
grafo do funil.

> **Estado atual: fase de design.** Conforme §37 do PRD, os documentos de arquitetura vêm
> antes do código. Nenhuma implementação foi iniciada.

## Documentos

| Documento | Conteúdo |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, camadas, arquitetura do canvas, arquitetura do agente/MCP, segurança, árvore de diretórios, **ambiguidades do PRD e defaults assumidos** |
| [DATABASE.md](./DATABASE.md) | Modelo de dados, DDL, RLS, RPC de salvamento, índices, ordem das migrations |
| [FUNNEL_SCHEMA.md](./FUNNEL_SCHEMA.md) | Taxonomia de nodes, tipos `FunnelNode`/`FunnelEdge`/`FunnelGroup`, lint determinístico, Funnel Math, contrato de entrada/saída da IA, template GD Frete |
| [ROADMAP.md](./ROADMAP.md) | Cinco fases com critérios de aceite e Definition of Done |

## O fluxo que o produto precisa fazer excepcionalmente bem

```
IDEIA → IA → FUNIL VISUAL → EDIÇÃO → ANÁLISE → MELHORIA → APRESENTAÇÃO
```

Tudo que não serve a esse fluxo fica fora do MVP.

## Princípios

1. O grafo é dado, não pixel — a IA lê JSON semântico, nunca screenshot.
2. Determinístico antes de probabilístico — o que um algoritmo detecta, não vai para a IA.
3. A IA propõe, o usuário aplica — nada muda o canvas sem clique humano.
4. Segredo nunca cruza a fronteira do servidor.
5. Camadas não vazam — `domain/` é puro, testável sem browser e sem banco.

## Próximo passo

Revisar as 12 ambiguidades listadas em [ARCHITECTURE.md §10](./ARCHITECTURE.md#10-ambiguidades-identificadas-no-prd-372)
e aprovar (ou corrigir) os defaults assumidos. Depois disso, Fase 0 do roadmap.
