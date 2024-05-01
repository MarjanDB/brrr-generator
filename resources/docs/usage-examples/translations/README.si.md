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
2. Ustvarjen izvoz iz brokerja postavi v ./exports mapo
3. Zaženi vse celice v dividents.ipynb (popravi datume za leto katero hočeš imet generiran izvoz)

