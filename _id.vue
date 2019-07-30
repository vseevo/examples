<template>
  <div>
    <el-main>
      <el-tabs type="card">
        <el-tab-pane label="Отображение">
          <el-header>
            <el-row :gutter="20">
              <el-col :span="12">
                <div class="grid-content">
                  <div class="controller-tools" style="display: inline">
                    <el-popover placement="right" title="Настройки" trigger="click">
                      <div class="popover-container" style="width: 400px">
                        <el-card class="box-card">
                          <div slot="header" class="clearfix">
                            <span>Столбцы</span>
                          </div>

                          <draggable v-model="visualDraggableTags">
                            <transition-group>
                              <el-tag
                                :type="column.visible ? 'success' : 'info'"
                                v-for="(column,
                                columnID) in reportState.headers"
                                class="el-tag-headlines"
                                :key="`${columnID}-draggable`"
                                @click="changeAttributeEvent(column, columnID)"
                              >
                                {{
                                $t(`report.labels.${column.title}.title`)
                                }}
                              </el-tag>
                            </transition-group>
                          </draggable>
                        </el-card>
                        <el-card class="box-card">
                          <div slot="header" class="clearfix">
                            <span>Записей на странице</span>
                          </div>

                          <el-select
                            v-model="visual.itemsPerPage"
                            placeholder="Element at page"
                            value-key="2"
                          >
                            <el-option
                              v-for="fitID in visual.maxItemsPerPage /
                                (visual.maxItemsPerPage / 5)"
                              :key="fitID"
                              :label="fitID * (visual.maxItemsPerPage / 5)"
                              :value="fitID * (visual.maxItemsPerPage / 5)"
                              selected
                            ></el-option>
                          </el-select>
                        </el-card>
                      </div>
                      <el-button slot="reference">
                        Настройки
                        <i class="el-icon-setting"></i>
                      </el-button>
                    </el-popover>
                  </div>
                  <el-date-picker
                    v-model="setUpDate"
                    type="daterange"
                    align="right"
                    start-placeholder="Start Date"
                    end-placeholder="End Date"
                    value-format="yyyy-MM-dd"
                    :picker-options="dateSetUpOptions"
                    @change="dateSetUpOptions.onPickSource"
                    :clearable="false"
                  ></el-date-picker>
                </div>
              </el-col>
              <el-col :span="6" :offset="6">
                <div class="grid-content">
                  <div class="search-box">
                    <el-dropdown @command="(x) => this.report.searchState = x">
                      <el-button type="primary">
                        История
                        <i class="el-icon-arrow-down el-icon--right"></i>
                      </el-button>
                      <el-dropdown-menu slot="dropdown">
                        <el-dropdown-item
                          v-for="(column, columnID) in searchHistory"
                          :key="columnID"
                          :command="column"
                        >{{ column }}</el-dropdown-item>
                      </el-dropdown-menu>
                    </el-dropdown>
                    <el-button @click="saveToHistory">Запомнить</el-button>
                    <el-input v-model="report.searchState" placeholder="Поиск..."></el-input>
                  </div>
                </div>
              </el-col>
            </el-row>
          </el-header>
          <el-table
            @header-click="tableSortEvent"
            ref="table"
            :data="reportState.content"
            border
            row-key="id"
            class="report-viewport"
          >
            <el-table-column
              v-for="(column, columnID) in reportState.headers.filter(
                (x) => x.visible
              )"
              :key="columnID"
              :prop="column.field"
              :label="$t(`report.labels.${column.title}.title`)"
              width="180"
            >
              <template slot-scope="props">
                <span>
                  {{
                  { value: props.row[column.field], type: column.type }
                  | capitalize
                  }}
                </span>
              </template>
            </el-table-column>
          </el-table>
          <span>Записей: {{ reportState.info.count }}</span>
          <el-pagination
            layout="prev, pager, next"
            :total="reportState.info.count"
            :page-size="visual.itemsPerPage"
            :hide-on-single-page="true"
            @current-change="pageChangeEvent"
            style="padding-top: 2rem"
          ></el-pagination>
        </el-tab-pane>
        <el-tab-pane label="Визуализация">
          <graphics :address="address"></graphics>
        </el-tab-pane>
        <el-tab-pane label="Экспортировать">
          <el-button @click="saveToExcelEvent">Excel</el-button>
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </div>
</template>
<script>
import draggable from "vuedraggable";
import { Loading } from "element-ui";
import graphics from "@/components/graphics";
import * as xlsx from "xlsx";
import fileSaver from "file-saver";

export default {
  middleware: "roles/buyer",
  layout: "dashboard/default",
  components: { draggable, graphics },

  async validate({ params, redirect, store }) {
    const request = await store.dispatch("reports/getReportByID", params.id);
    if (request) return true;

    return redirect(`/${params.lang}/notfound`);
  },

  computed: {
    visualDraggableTags: {
      get() {
        return this.reportState.headers;
      },

      set(headers) {
        this.$store.commit("reports/REPORT_STATE_CHANGE_HEADER", {
          reportID: this.address,
          headers
        });

        this.prepareTabulatorData();
      }
    }
  },

  mounted() {
    const state = localStorage.getItem("searchHistory");

    if (state) {
      this.searchHistory = JSON.parse(state);
    }
  },

  filters: {
    capitalize({ value, type }) {
      function digits(value, fractionDigits = 2) {
        if (value % 1 !== 0) return Number(value).toFixed(fractionDigits);
        return value;
      }

      switch (type) {
        case "time":
          const time = new Date(1970, 0, 1);
          time.setSeconds(value);

          return time
            .toLocaleDateString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            })
            .split(",")[1];

        case "money":
          return `${digits(value)}`;
        case "percent":
          return `${digits(value)} %`;
        case "number":
          return digits(value);

        default:
          return value;
      }
    },

    formatDate(date) {
      const parseDate = new Date(Date.parse(date));

      return parseDate
        .toLocaleString("ru-RU", {
          timeZone: "Europe/Moscow"
        })
        .slice(0, 10)
        .split(".")
        .reverse()
        .join("-");
    }
  },

  data() {
    return {
      searchLabel: null,
      pageIndex: 1,

      searchHistory: [],

      visual: {
        itemsPerPage: 20,
        maxItemsPerPage: 100
      },

      report: {
        searchState: null,
        timeoutSeconds: {
          timer: null,
          timeout: 0
        }
      },

      UI: {
        sortable: {
          field: null,
          type: null,
          enable: false
        }
      },

      dateSetUpOptions: {
        disabledDate: date => {
          const state = this.availableDates
            .flatMap(x => {
              const date = new Date(Date.parse(x));
              date.setHours(0, 0, 0, 0);
              return date.getTime();
            })
            .includes(date.getTime());

          return !state;
        },

        onPickSource: async dateArray => {
          if (!dateArray)
            dateArray = [
              this.reportState.info.meta.start_date,
              this.reportState.info.meta.end_date
            ];

          Loading.service({ fullscreen: true });

          const state = await this.$store.dispatch("reports/reportUpdateByID", {
            profile_id: this.reportState.info.meta.GaaProfileID,
            report_id: parseInt(this.address),
            date_start: dateArray[0],
            date_end: dateArray[1]
          });

          Loading.service().close();

          if (!state) select;
          this.$notify.error({
            title: "Info",
            message: "ошибка обновления отчета"
          });

          window.location.reload(true);
        }
      }
    };
  },

  async asyncData({ store, params }) {
    const { id } = params;

    const patterns = store.getters["reports/getPatterns"]({
      keys: ["income", "roaming", "drr"],
      array: true
    });

    patterns.forEach(pattern =>
      store.commit("reports/addColumnCalculator", {
        id,
        pattern
      })
    );

    const reportState = store.getters["reports/reportState"]({
      address: params.id,
      search: null,
      elements: 20,
      page: 1
    });

    const { dates } = await store.dispatch("reports/getDateAvailableByGoogle", {
      googleID: reportState.info.meta.GaaProfileID
    });

    return {
      reportState,
      address: params.id,
      setUpDate: [
        reportState.info.meta.start_date,
        reportState.info.meta.end_date
      ],

      availableDates: dates
    };
  },

  watch: {
    "visual.itemsPerPage"() {
      this.prepareTabulatorData(true);
    },

    "report.searchState"() {
      if (this.report.timeoutSeconds.timeout > Date.now()) {
        clearTimeout(this.report.timeoutSeconds.timer);
      }

      this.report.timeoutSeconds = {
        timer: setTimeout(this.prepareTabulatorData, true, 500),
        timeout: Date.now() + 500
      };
    }
  },

  methods: {
    saveToHistory() {
      if (this.report.searchState) {
        this.searchHistory.push(this.report.searchState);
        localStorage.setItem(
          "searchHistory",
          JSON.stringify(this.searchHistory)
        );
      }
    },

    changeAttributeEvent(column, columnID) {
      this.$store.commit("reports/swapColumns", {
        headerID: columnID,
        reportID: this.address
      });

      this.prepareTabulatorData(true);
    },

    prepareTabulatorData(reset) {
      this.reportState = this.$store.getters["reports/reportState"]({
        address: this.address,
        search: this.report.searchState,
        page: reset ? (this.pageIndex = 1) : this.pageIndex,
        elements: this.visual.itemsPerPage
      });
    },

    pageChangeEvent(index) {
      this.pageIndex = index;
      this.prepareTabulatorData();
    },

    /**
     * сортировка таблицы посредством store/reports
     */

    tableSortEvent(column, boolean) {
      if (column.property === null && this.UI.sortable.enable) {
        this.$store.commit("reports/sortable", {
          headerName: this.UI.sortable.field,
          reportID: this.address,
          type: this.UI.sortable.type
        });
      } else if (column.property) {
        const type = this.UI.sortable.type === "asc" ? "desc" : "asc";
        this.$store.commit("reports/sortable", {
          headerName: column.property,
          reportID: this.address,
          type
        });

        this.UI.sortable = { field: column.property, type, enable: true };
      }

      this.prepareTabulatorData(boolean);
    },


    /**
     * Пробный метод, в продашкине будет отпимизирован и перенесен в store/reports
     */
    saveToExcelEvent() {
      const xs = xlsx.utils.book_new();

      xs.Props = {
        Title: "test",
        Subject: "example subject",
        Author: "Ivan Chikishev"
      };

      xs.SheetNames.push("test table");
      const wsData = this.$store.getters["reports/generateExcelValues"](
        this.address
      );
      const ws = xlsx.utils.aoa_to_sheet(wsData);

      xs.Sheets["test table"] = ws;

      const wboat = xlsx.write(xs, { bookType: "xlsx", type: "binary" });
      const buff = new ArrayBuffer(wboat.length);
      const view = new Uint8Array(buff);

      for (var i = 0; i < wboat.length; i++) {
        view[i] = wboat.charCodeAt(i) & 0xff;
      }

      fileSaver.saveAs(
        new Blob([buff], { type: "application/octet-stream" }),
        "test.xlsx"
      );
    }
  }
};
</script>
<style lang="scss">
.el-tag-headlines {
  cursor: pointer;
}

.report-viewport .el-table__body {
  tbody {
    tr:first-child {
      background-color: #f1f1f1;
    }
    tr:last-child {
      background-color: #f1f1f1;
    }
  }
}
</style>
