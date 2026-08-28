using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class DedicatedGlAccountsPerMoneyAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DO $$
DECLARE
    v_branch_cash_parent_id uuid;
    v_central_local_parent_id uuid;
    v_main_gl_id uuid;
    v_main_money_id uuid;
    rec RECORD;
    v_parent_code text;
    v_parent_id uuid;
    v_seq int;
    v_new_code text;
    v_new_gl_id uuid;
    v_curr_code text;
BEGIN
    -- 1. Ensure 134122 exists
    SELECT ""Id"" INTO v_branch_cash_parent_id FROM accounts WHERE ""Code"" = '13412';
    IF v_branch_cash_parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM accounts WHERE ""Code"" = '134122') THEN
        INSERT INTO accounts (""Id"", ""Code"", ""Name"", ""Classification"", ""ParentAccountId"", ""IsGroup"", ""IsActive"")
        VALUES (gen_random_uuid(), '134122', 'نقدية لدى صندوق الفروع بالعملة الأجنبية', 'Asset', v_branch_cash_parent_id, true, true);
    END IF;

    -- 2. Convert UAS parents into groups
    UPDATE accounts SET ""IsGroup"" = true WHERE ""Code"" IN ('134111', '134112', '134121', '134122', '13421', '13422');

    -- 3. Delete duplicate test accounts CASH-MAIN-IQD1 and CASH-MAIN-IQD12
    DELETE FROM money_account_access WHERE ""MoneyAccountId"" IN (SELECT ""Id"" FROM money_accounts WHERE ""Code"" IN ('CASH-MAIN-IQD1', 'CASH-MAIN-IQD12'));
    DELETE FROM money_accounts WHERE ""Code"" IN ('CASH-MAIN-IQD1', 'CASH-MAIN-IQD12');

    -- 4. Dedicated GL for canonical CASH-MAIN-IQD
    SELECT ""Id"" INTO v_central_local_parent_id FROM accounts WHERE ""Code"" = '134111';
    SELECT ""Id"" INTO v_main_gl_id FROM accounts WHERE ""Code"" = '13411101';
    SELECT ""Id"" INTO v_main_money_id FROM money_accounts WHERE ""Code"" = 'CASH-MAIN-IQD';

    IF v_central_local_parent_id IS NOT NULL THEN
        IF v_main_gl_id IS NULL THEN
            v_main_gl_id := gen_random_uuid();
            INSERT INTO accounts (""Id"", ""Code"", ""Name"", ""Classification"", ""ParentAccountId"", ""IsGroup"", ""IsActive"")
            VALUES (v_main_gl_id, '13411101', 'Main Cashbox IQD', 'Asset', v_central_local_parent_id, false, true);
        END IF;

        IF v_main_money_id IS NOT NULL THEN
            UPDATE money_accounts SET ""AccountingAccountId"" = v_main_gl_id WHERE ""Id"" = v_main_money_id;
        END IF;
    END IF;

    -- 5. If any other money account is pointing to a group account, create dedicated GL for it
    FOR rec IN 
        SELECT ma.""Id"", ma.""Name"" as ma_name, ma.""AccountingAccountId"", a.""Code"" as gl_code, c.""Code"" as curr_code
        FROM money_accounts ma
        JOIN accounts a ON ma.""AccountingAccountId"" = a.""Id""
        JOIN currencies c ON ma.""CurrencyId"" = c.""Id""
        WHERE a.""IsGroup"" = true
    LOOP
        v_parent_id := rec.""AccountingAccountId"";
        v_parent_code := rec.gl_code;
        v_curr_code := rec.curr_code;

        SELECT COALESCE(MAX(NULLIF(regexp_replace(SUBSTRING(""Code"" FROM LENGTH(v_parent_code) + 1), '[^0-9]', '', 'g'), '')::int), 0) + 1
        INTO v_seq
        FROM accounts
        WHERE ""Code"" LIKE v_parent_code || '%';

        v_new_code := v_parent_code || LPAD(v_seq::text, 2, '0');
        v_new_gl_id := gen_random_uuid();

        INSERT INTO accounts (""Id"", ""Code"", ""Name"", ""Classification"", ""ParentAccountId"", ""IsGroup"", ""IsActive"")
        VALUES (v_new_gl_id, v_new_code, rec.ma_name || ' ' || v_curr_code, 'Asset', v_parent_id, false, true);

        UPDATE money_accounts SET ""AccountingAccountId"" = v_new_gl_id WHERE ""Id"" = rec.""Id"";
    END LOOP;
END $$;
");

            migrationBuilder.DropIndex(
                name: "IX_money_accounts_AccountingAccountId",
                table: "money_accounts");

            migrationBuilder.CreateIndex(
                name: "IX_money_accounts_AccountingAccountId",
                table: "money_accounts",
                column: "AccountingAccountId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_money_accounts_AccountingAccountId",
                table: "money_accounts");

            migrationBuilder.CreateIndex(
                name: "IX_money_accounts_AccountingAccountId",
                table: "money_accounts",
                column: "AccountingAccountId");
        }
    }
}
