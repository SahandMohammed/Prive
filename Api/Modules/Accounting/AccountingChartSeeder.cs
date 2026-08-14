using Api.Shared.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Modules.Accounting;

public static class AccountingChartSeeder
{
  public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
  {
    // The starter chart is created exactly once. It is never reconciled from
    // code again, so administrator edits and deletions always remain intact.
    if (await db.Accounts.AnyAsync(ct)) return;

    var accounts = new Dictionary<string, AccountEntity>();
    foreach (var seed in Seeds)
    {
      accounts.Add(seed.Code, new AccountEntity
      {
        Code = seed.Code,
        Name = seed.Name,
        Classification = seed.Classification,
        ParentAccount = seed.ParentCode is null ? null : accounts[seed.ParentCode],
        IsGroup = seed.IsGroup,
        IsActive = true
      });
    }

    db.Accounts.AddRange(accounts.Values);
    await db.SaveChangesAsync(ct);
  }

  private sealed record AccountSeed(string Code, string Name, AccountClassification Classification, bool IsGroup, string? ParentCode);

  private static readonly AccountSeed[] Seeds =
  [
    new("1", "الأصول", AccountClassification.Asset, true, null),
    new("11", "الأصول غير المتداولة", AccountClassification.Asset, true, "1"),
    new("111", "الممتلكات والآلات والمعدات", AccountClassification.Asset, true, "11"),
    new("1113", "آلات ومعدات", AccountClassification.Asset, false, "111"),
    new("1115", "عدد وقوالب", AccountClassification.Asset, false, "111"),
    new("1116", "أثاث وأجهزة مكاتب", AccountClassification.Asset, false, "111"),
    new("13", "الأصول المتداولة", AccountClassification.Asset, true, "1"),
    new("131", "المخزون", AccountClassification.Asset, true, "13"),
    new("1311", "مخزون المواد الأولية", AccountClassification.Asset, false, "131"),
    new("1314", "مخزون مواد التعبئة والتغليف", AccountClassification.Asset, false, "131"),
    new("1315", "مخزون المتنوعات", AccountClassification.Asset, false, "131"),
    new("1317", "مخزون البضائع والأراضي بغرض البيع", AccountClassification.Asset, false, "131"),
    new("132", "الذمم المدينة", AccountClassification.Asset, true, "13"),
    new("1321", "مدينون تجاريون", AccountClassification.Asset, true, "132"),
    new("13214", "مدينون تجاريون قطاع خاص", AccountClassification.Asset, false, "1321"),
    new("1326", "حسابات مدينة متنوعة", AccountClassification.Asset, true, "132"),
    new("13263", "مصاريف مدفوعة مقدماً", AccountClassification.Asset, false, "1326"),
    new("134", "النقود", AccountClassification.Asset, true, "13"),
    new("1341", "نقدية بالصندوق", AccountClassification.Asset, true, "134"),
    new("13411", "نقدية لدى صندوق المركز", AccountClassification.Asset, true, "1341"),
    new("134111", "نقدية لدى صندوق المركز بالعملة المحلية", AccountClassification.Asset, false, "13411"),
    new("134112", "نقدية لدى صندوق المركز بالعملة الأجنبية", AccountClassification.Asset, false, "13411"),
    new("13412", "نقدية لدى صندوق الفروع", AccountClassification.Asset, true, "1341"),
    new("134121", "نقدية لدى صندوق الفروع بالعملة المحلية", AccountClassification.Asset, false, "13412"),
    new("1342", "نقدية لدى المصارف", AccountClassification.Asset, true, "134"),
    new("13421", "نقدية لدى المصارف بالعملة المحلية", AccountClassification.Asset, false, "1342"),
    new("13422", "نقدية لدى المصارف بالعملة الأجنبية", AccountClassification.Asset, false, "1342"),
    new("2", "الالتزامات", AccountClassification.Liability, true, null),
    new("21", "الالتزامات غير المتداولة", AccountClassification.Liability, true, "2"),
    new("221", "متراكم اندثار الممتلكات والآلات والمعدات", AccountClassification.ContraAsset, true, "2"),
    new("2213", "متراكم اندثار آلات ومعدات", AccountClassification.ContraAsset, false, "221"),
    new("2215", "متراكم اندثار عدد وقوالب", AccountClassification.ContraAsset, false, "221"),
    new("2216", "متراكم اندثار أثاث وأجهزة مكاتب", AccountClassification.ContraAsset, false, "221"),
    new("23", "الالتزامات المتداولة", AccountClassification.Liability, true, "2"),
    new("232", "الذمم الدائنة", AccountClassification.Liability, true, "23"),
    new("2321", "دائنون تجاريون", AccountClassification.Liability, true, "232"),
    new("23214", "دائنون تجاريون قطاع خاص", AccountClassification.Liability, false, "2321"),
    new("2326", "حسابات دائنة متنوعة", AccountClassification.Liability, true, "232"),
    new("23262", "إيرادات مستلمة مقدماً", AccountClassification.Liability, false, "2326"),
    new("23263", "مصاريف مستحقة", AccountClassification.Liability, false, "2326"),
    new("23264", "رواتب وأجور مستحقة", AccountClassification.Liability, false, "2326"),
    new("26", "حقوق الملكية", AccountClassification.Equity, true, "2"),
    new("261", "رأس المال", AccountClassification.Equity, false, "26"),
    new("262", "رأس المال الإضافي (الاحتياطيات)", AccountClassification.Equity, true, "26"),
    new("263", "الأرباح المحتجزة", AccountClassification.Equity, true, "26"),
    new("2631", "الفائض المتراكم", AccountClassification.Equity, false, "263"),
    new("2632", "العجز المتراكم", AccountClassification.Equity, false, "263"),
    new("3", "المصروفات", AccountClassification.Expense, true, null),
    new("31", "الرواتب والأجور", AccountClassification.Expense, true, "3"),
    new("311", "الرواتب النقدية للموظفين", AccountClassification.Expense, true, "31"),
    new("3111", "رواتب", AccountClassification.Expense, false, "311"),
    new("312", "الأجور النقدية للعمال", AccountClassification.Expense, true, "31"),
    new("3121", "أجور", AccountClassification.Expense, false, "312"),
    new("314", "المساهمة في الضمان الاجتماعي للموظفين", AccountClassification.Expense, false, "31"),
    new("315", "المساهمة في الضمان الاجتماعي للعمال", AccountClassification.Expense, false, "31"),
    new("318", "منافع الموظفين", AccountClassification.Expense, false, "31"),
    new("32", "المستلزمات السلعية", AccountClassification.Expense, true, "3"),
    new("321", "الخامات والمواد الأولية", AccountClassification.Expense, false, "32"),
    new("324", "مواد التعبئة والتغليف", AccountClassification.Expense, false, "32"),
    new("325", "المتنوعات", AccountClassification.Expense, true, "32"),
    new("3251", "اللوازم والمهمات", AccountClassification.Expense, false, "325"),
    new("3252", "القرطاسية", AccountClassification.Expense, false, "325"),
    new("3263", "مواد طبية", AccountClassification.Expense, false, "32"),
    new("327", "المياه والكهرباء", AccountClassification.Expense, true, "32"),
    new("3271", "المياه", AccountClassification.Expense, false, "327"),
    new("3272", "الكهرباء", AccountClassification.Expense, false, "327"),
    new("329", "مستلزمات سلعية أخرى", AccountClassification.Expense, false, "32"),
    new("33", "المستلزمات الخدمية", AccountClassification.Expense, true, "3"),
    new("331", "نفقات الخدمات الأساسية", AccountClassification.Expense, true, "33"),
    new("3313", "نفقات الاتصالات", AccountClassification.Expense, false, "331"),
    new("3314", "خدمات أبحاث واستشارات", AccountClassification.Expense, false, "331"),
    new("3316", "خدمات الترويج والضيافة", AccountClassification.Expense, true, "331"),
    new("33161", "دعاية وإعلان", AccountClassification.Expense, false, "3316"),
    new("332", "نفقات الصيانة", AccountClassification.Expense, true, "33"),
    new("33213", "صيانة آلات ومعدات", AccountClassification.Expense, false, "332"),
    new("33216", "صيانة أثاث وأجهزة مكاتب", AccountClassification.Expense, false, "332"),
    new("334", "استئجار أصول غير متداولة", AccountClassification.Expense, true, "33"),
    new("3341", "استئجار الممتلكات والآلات والمعدات", AccountClassification.Expense, true, "334"),
    new("33412", "استئجار مباني وإنشاءات", AccountClassification.Expense, false, "3341"),
    new("336", "مصروفات خدمية متنوعة", AccountClassification.Expense, true, "33"),
    new("3362", "أقساط تأمين", AccountClassification.Expense, false, "336"),
    new("3365", "خدمات قانونية", AccountClassification.Expense, false, "336"),
    new("3366", "خدمات مصرفية", AccountClassification.Expense, false, "336"),
    new("3367", "أجور تدقيق وتنظيم الحسابات", AccountClassification.Expense, false, "336"),
    new("339", "مصروفات تشغيلية أخرى", AccountClassification.Expense, true, "33"),
    new("3399", "مصروفات أخرى", AccountClassification.Expense, false, "339"),
    new("35", "مشتريات البضائع والأراضي بغرض البيع", AccountClassification.Expense, true, "3"),
    new("351", "مشتريات البضائع بغرض البيع", AccountClassification.Expense, true, "35"),
    new("3511", "مشتريات بغرض البيع محلية", AccountClassification.Expense, false, "351"),
    new("3512", "مشتريات بغرض البيع مستوردة", AccountClassification.Expense, false, "351"),
    new("353", "مردودات ومسموحات المشتريات", AccountClassification.Expense, false, "35"),
    new("36", "كلف الإنتاج والبضائع المباعة", AccountClassification.Expense, true, "3"),
    new("364", "كلف البضائع المباعة للنشاط التجاري", AccountClassification.Expense, true, "36"),
    new("3641", "كلف البضائع المباعة", AccountClassification.Expense, false, "364"),
    new("37", "الاندثارات والإطفاءات", AccountClassification.Expense, true, "3"),
    new("371", "الاندثارات", AccountClassification.Expense, true, "37"),
    new("3711", "اندثار الممتلكات والآلات والمعدات", AccountClassification.Expense, true, "371"),
    new("37113", "اندثار آلات ومعدات", AccountClassification.Expense, false, "3711"),
    new("37115", "اندثار عدد وقوالب", AccountClassification.Expense, false, "3711"),
    new("37116", "اندثار أثاث وأجهزة مكاتب", AccountClassification.Expense, false, "3711"),
    new("4", "الإيرادات", AccountClassification.Revenue, true, null),
    new("42", "إيراد النشاط التجاري", AccountClassification.Revenue, true, "4"),
    new("421", "إيراد مبيعات بضائع وأراضي بغرض البيع", AccountClassification.Revenue, true, "42"),
    new("4211", "إيراد مبيعات بضائع بغرض البيع", AccountClassification.Revenue, false, "421"),
    new("4213", "مردودات ومسموحات بضائع وأراضي بغرض البيع", AccountClassification.Revenue, false, "421"),
    new("43", "إيراد النشاط الخدمي", AccountClassification.Revenue, true, "4"),
    new("431", "إيراد خدمات أساسية", AccountClassification.Revenue, true, "43"),
    new("4312", "إيراد خدمات صحية", AccountClassification.Revenue, true, "431"),
    new("43121", "إيراد خدمات مقدمة", AccountClassification.Revenue, false, "4312"),
    new("4319", "إيرادات أساسية أخرى", AccountClassification.Revenue, false, "431"),
    new("436", "إيراد خدمات متنوعة", AccountClassification.Revenue, false, "43"),
    new("439", "إيرادات تشغيلية أخرى", AccountClassification.Revenue, false, "43")
  ];
}
