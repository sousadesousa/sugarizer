/* @ SimpleMode
 @desc This is the subcomponent of the settings component */

const SimpleMode = {
	name: 'SimpleMode',
	template: `
				<dialog-box
					ref="simplemode"
					iconData="./icons/view-list.svg"
					isNative="true"
					:titleData="$t('SimpleMode')"
					ok-button="true"
					cancel-button="true"
					v-on:on-cancel="close('simplemode')"
					v-on:on-ok="okClicked"
				>
					<div class="computer-content">
						<div class="settings-subscreen" style="padding: 24px; line-height: 1.6;">
							<input class="toggle simplemode-checkbox" type="checkbox" v-model="enabled" id="simplemode-checkbox">
							<label for="simplemode-checkbox" class="simplemode-label">{{$t('SimpleModeToggle')}}</label>
							<div class="simplemode-help" style="margin-top: 12px; opacity: 0.75;">{{$t('SimpleModeHelp')}}</div>
						</div>
					</div>
				</dialog-box>
	`,
	components: {
		'dialog-box': Dialog,
	},

	emits: ['close'],

	data() {
		return {
			enabled: (sugarizer.modules.settings.getUser().toolbarMode === 'simple'),
		}
	},

	methods: {

		close(ref) {
			this.$refs[ref].showDialog = false;
			this.$emit('close', null);
		},

		openModal(ref) {
			this.$refs[ref].showDialog = true;
		},

		async okClicked() {
			sugarizer.modules.settings.setUser({toolbarMode: this.enabled ? 'simple' : 'full'});
			this.close('simplemode');
		}

	}

};

if (typeof module !== 'undefined') module.exports = { SimpleMode }
