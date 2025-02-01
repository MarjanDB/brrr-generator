# Ustvarjanje uvoznih datotek za platformo EDavki

**Ustvarjeni izvozi lahko vsebujejo napake, zato se naj te preverijo za morebitne napake pred oddajo na platformi EDavki**

## Uporaba
### Generiranje Izvoza iz IBKR platforme
![Lokacija Flex Queries](../images/flex-queries-location.png)
![Kako ustvarit Flex Query](../images/flex-query-new.png)
![Flex Query Sekcije](../images/flex-queries-selected.png)

#### Izbiranje podrobnosti Flex Query Sekcij
> Izbrane sekcije naj vsebujejo vse podrobnosti

![Flex Query Trade Sekcija](../images/flex-query-trades.png)
![Flex Query Cash Transactions Sekcija](../images/flex-query-cash-transaction.png)

### Zagon Programa

1. Ustvari konfiguracijsko datoteko v ./config mapi (primer je podan)
2. Ustvarjen izvoz iz brokerja postavi v ./imports mapo
3. Zaženi celice v .ipynb datoteki specifični za dokument ki pripravljaš (`./notebooks` mapa) (v .ipynb datoteki popravi datume za leto katero hočeš imet generiran izvoz)

